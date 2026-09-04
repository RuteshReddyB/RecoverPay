import os
import json
import uuid
import datetime
from typing import Dict, Any, List, Optional
from backend.config import settings
from backend.utils.logger import logger

class MockFirestoreCollection:
    """
    In-memory Firestore Collection mock for zero-config local run capability.
    Maintains Firestore document semantics, querying, and transactional safety.
    """
    def __init__(self, name: str):
        self.name = name
        self._documents: Dict[str, Dict[str, Any]] = {}

    def document(self, doc_id: str):
        return MockFirestoreDocument(self, doc_id)

    def add(self, data: Dict[str, Any], doc_id: Optional[str] = None):
        doc_id = doc_id or str(uuid.uuid4())
        doc_ref = self.document(doc_id)
        doc_ref.set(data)
        return doc_ref

    def stream(self):
        for doc_id, data in self._documents.items():
            yield MockDocumentSnapshot(doc_id, data)

    def where(self, field: str, op: str, value: Any):
        return MockQuery(self, [(field, op, value)])

    def order_by(self, field: str, direction: str = "ASCENDING"):
        return MockQuery(self, [], order_by=(field, direction))

    def limit(self, count: int):
        return MockQuery(self, [], limit=count)

    def offset(self, count: int):
        return MockQuery(self, [], offset=count)

class MockDocumentSnapshot:
    def __init__(self, doc_id: str, data: Dict[str, Any]):
        self.id = doc_id
        self.exists = data is not None
        self._data = data

    def to_dict(self):
        return self._data.copy() if self._data else {}

class MockFirestoreDocument:
    def __init__(self, collection: MockFirestoreCollection, doc_id: str):
        self.collection = collection
        self.id = doc_id

    def get(self):
        data = self.collection._documents.get(self.id)
        return MockDocumentSnapshot(self.id, data)

    def set(self, data: Dict[str, Any], merge: bool = False):
        if merge and self.id in self.collection._documents:
            self.collection._documents[self.id].update(data)
        else:
            self.collection._documents[self.id] = data.copy()

    def update(self, data: Dict[str, Any]):
        if self.id in self.collection._documents:
            self.collection._documents[self.id].update(data)
        else:
            self.collection._documents[self.id] = data.copy()

    def delete(self):
        if self.id in self.collection._documents:
            del self.collection._documents[self.id]

class MockQuery:
    def __init__(self, collection: MockFirestoreCollection, filters: Optional[List] = None, order_by=None, limit: Optional[int] = None, offset: Optional[int] = None):
        self.collection = collection
        self.filters = filters or []
        self._order_by = order_by
        self._limit = limit
        self._offset = offset

    def where(self, field: str, op: str, value: Any):
        new_filters = self.filters + [(field, op, value)]
        return MockQuery(self.collection, new_filters, self._order_by, self._limit, self._offset)

    def order_by(self, field: str, direction: str = "ASCENDING"):
        return MockQuery(self.collection, self.filters, (field, direction), self._limit, self._offset)

    def limit(self, count: int):
        return MockQuery(self.collection, self.filters, self._order_by, count, self._offset)

    def offset(self, count: int):
        return MockQuery(self.collection, self.filters, self._order_by, self._limit, count)

    def stream(self):
        results = []
        for doc_id, data in self.collection._documents.items():
            match = True
            for field, op, val in self.filters:
                doc_val = data.get(field)
                if op == "==" and doc_val != val:
                    match = False
                elif op == ">=" and (doc_val is None or doc_val < val):
                    match = False
                elif op == "<=" and (doc_val is None or doc_val > val):
                    match = False
                elif op == "in" and (val is None or doc_val not in val):
                    match = False
            if match:
                results.append(MockDocumentSnapshot(doc_id, data))

        if self._order_by:
            field, direction = self._order_by
            reverse = direction.upper() in ["DESC", "DESCENDING"]
            results.sort(key=lambda x: x.to_dict().get(field, ""), reverse=reverse)

        if self._offset:
            results = results[self._offset:]
        if self._limit is not None:
            results = results[:self._limit]

        for res in results:
            yield res

class MockFirestoreClient:
    def __init__(self):
        self._collections: Dict[str, MockFirestoreCollection] = {}

    def collection(self, name: str) -> MockFirestoreCollection:
        if name not in self._collections:
            self._collections[name] = MockFirestoreCollection(name)
        return self._collections[name]

_firestore_client = None
_is_mock_mode = True

def get_db():
    global _firestore_client, _is_mock_mode
    if _firestore_client is not None:
        return _firestore_client, _is_mock_mode

    cred_file = getattr(settings, "FIREBASE_CREDENTIALS_PATH", "firebase-credentials.json")
    has_creds = bool(settings.FIREBASE_CREDENTIALS_JSON) or (os.path.exists(cred_file) if cred_file else False)

    # Attempt to load live Firebase Admin SDK if credentials provided
    if has_creds and not settings.FIREBASE_MOCK_MODE:
        try:
            import firebase_admin
            from firebase_admin import credentials, firestore
            
            if not firebase_admin._apps:
                if settings.FIREBASE_CREDENTIALS_JSON and settings.FIREBASE_CREDENTIALS_JSON.startswith("{"):
                    cred_dict = json.loads(settings.FIREBASE_CREDENTIALS_JSON)
                    cred = credentials.Certificate(cred_dict)
                elif settings.FIREBASE_CREDENTIALS_JSON:
                    cred = credentials.Certificate(settings.FIREBASE_CREDENTIALS_JSON)
                elif cred_file and os.path.exists(cred_file):
                    cred = credentials.Certificate(cred_file)
                else:
                    raise ValueError("No valid credential source found")
                    
                firebase_admin.initialize_app(cred, {"projectId": settings.FIREBASE_PROJECT_ID})
            
            _firestore_client = firestore.client()
            _is_mock_mode = False
            logger.info("Successfully connected to live Firebase Firestore.")
            return _firestore_client, _is_mock_mode
        except Exception as e:
            logger.warning(f"Failed to initialize live Firebase Admin SDK: {e}. Falling back to Mock Firestore.")

    # Fallback to Mock Firestore
    _firestore_client = MockFirestoreClient()
    _is_mock_mode = True
    logger.info("Initialized Firebase Mock Client for zero-config local run.")
    return _firestore_client, _is_mock_mode
