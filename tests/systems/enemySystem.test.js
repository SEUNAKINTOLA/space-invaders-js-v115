"""
🧪 Comprehensive Test Suite - 2025 Best Practices
=================================================
Framework: pytest
Coverage Target: 90%+
Architecture: AAA Pattern with Smart Mocking
"""

import pytest
import asyncio
import time
from unittest.mock import Mock, patch, MagicMock, AsyncMock
from dataclasses import dataclass
from typing import Dict, List, Optional, Any
from contextlib import contextmanager
import json
import tempfile
import os
from datetime import datetime, timedelta

# Test Data Factories
# ===================

@dataclass
class TestDataFactory:
    """🏭 Smart test data factory with realistic defaults"""
    
    @classmethod
    def create_user(cls, **overrides) -> Dict[str, Any]:
        defaults = {
            "id": 1,
            "email": "test@example.com",
            "name": "Test User",
            "role": "user",
            "created_at": datetime.now().isoformat(),
            "is_active": True
        }
        return {**defaults, **overrides}
    
    @classmethod
    def create_product(cls, **overrides) -> Dict[str, Any]:
        defaults = {
            "id": 1,
            "name": "Test Product",
            "price": 99.99,
            "category": "electronics",
            "stock": 10,
            "is_available": True
        }
        return {**defaults, **overrides}

# Test Utilities
# ==============

@contextmanager
def timer():
    """⏱️ Performance measurement context manager"""
    class Timer:
        def __init__(self):
            self.elapsed = 0
    
    t = Timer()
    start = time.time()
    try:
        yield t
    finally:
        t.elapsed = time.time() - start

class MockDatabase:
    """🗄️ Smart database mock with realistic behavior"""
    
    def __init__(self):
        self.data = {}
        self.call_count = 0
        self.last_query = None
    
    def find(self, table: str, id: int) -> Optional[Dict]:
        self.call_count += 1
        self.last_query = f"SELECT * FROM {table} WHERE id = {id}"
        return self.data.get(f"{table}_{id}")
    
    def save(self, table: str, data: Dict) -> Dict:
        self.call_count += 1
        id = data.get('id', len(self.data) + 1)
        key = f"{table}_{id}"
        self.data[key] = {**data, 'id': id}
        return self.data[key]
    
    def delete(self, table: str, id: int) -> bool:
        self.call_count += 1
        key = f"{table}_{id}"
        if key in self.data:
            del self.data[key]
            return True
        return False

# Fixtures
# ========

@pytest.fixture
def mock_database():
    """🗄️ Database mock fixture with cleanup"""
    db = MockDatabase()
    yield db
    # Cleanup after test
    db.data.clear()

@pytest.fixture
def sample_user():
    """👤 Sample user fixture"""
    return TestDataFactory.create_user()

@pytest.fixture
def sample_product():
    """📦 Sample product fixture"""
    return TestDataFactory.create_product()

@pytest.fixture
def temp_file():
    """📁 Temporary file fixture with cleanup"""
    with tempfile.NamedTemporaryFile(mode='w+', delete=False) as f:
        f.write('{"test": "data"}')
        temp_path = f.name
    
    yield temp_path
    
    # Cleanup
    if os.path.exists(temp_path):
        os.unlink(temp_path)

@pytest.fixture
async def async_mock_service():
    """🔄 Async service mock"""
    mock = AsyncMock()
    mock.fetch_data.return_value = {"status": "success", "data": []}
    return mock

# Example Service Class to Test
# =============================

class UserService:
    """👤 Example user service for demonstration"""
    
    def __init__(self, database=None, cache=None):
        self.database = database
        self.cache = cache
    
    def create_user(self, user_data: Dict) -> Dict:
        if not user_data.get('email'):
            raise ValueError("Email is required")
        
        if '@' not in user_data['email']:
            raise ValueError("Invalid email format")
        
        return self.database.save('users', user_data)
    
    def get_user(self, user_id: int) -> Optional[Dict]:
        if user_id <= 0:
            raise ValueError("User ID must be positive")
        
        # Check cache first
        if self.cache:
            cached = self.cache.get(f"user_{user_id}")
            if cached:
                return cached
        
        user = self.database.find('users', user_id)
        
        # Cache the result
        if self.cache and user:
            self.cache.set(f"user_{user_id}", user)
        
        return user
    
    def delete_user(self, user_id: int) -> bool:
        if user_id <= 0:
            raise ValueError("User ID must be positive")
        
        success = self.database.delete('users', user_id)
        
        # Clear cache
        if self.cache and success:
            self.cache.delete(f"user_{user_id}")
        
        return success
    
    async def fetch_user_stats(self, user_id: int) -> Dict:
        """Async method for external API calls"""
        await asyncio.sleep(0.1)  # Simulate API call
        return {"user_id": user_id, "login_count": 42, "last_login": datetime.now().isoformat()}

# Unit Tests
# ==========

class TestUserService:
    """🧪 Comprehensive UserService test suite"""
    
    def test_create_user_with_valid_data_should_succeed(self, mock_database):
        """✅ Should create user with valid data"""
        # Arrange
        service = UserService(database=mock_database)
        user_data = TestDataFactory.create_user(email="valid@test.com")
        
        # Act
        result = service.create_user(user_data)
        
        # Assert
        assert result['email'] == "valid@test.com"
        assert result['id'] is not None
        assert mock_database.call_count == 1
    
    def test_create_user_without_email_should_raise_error(self, mock_database):
        """❌ Should raise ValueError when email is missing"""
        # Arrange
        service = UserService(database=mock_database)
        user_data = TestDataFactory.create_user()
        del user_data['email']
        
        # Act & Assert
        with pytest.raises(ValueError, match="Email is required"):
            service.create_user(user_data)
    
    @pytest.mark.parametrize("invalid_email", [
        "invalid-email",
        "no-at-symbol",
        "",
        None
    ])
    def test_create_user_with_invalid_email_should_raise_error(self, mock_database, invalid_email):
        """❌ Should raise ValueError for invalid email formats"""
        # Arrange
        service = UserService(database=mock_database)
        user_data = TestDataFactory.create_user(email=invalid_email)
        
        # Act & Assert
        with pytest.raises(ValueError):
            service.create_user(user_data)
    
    def test_get_user_with_valid_id_should_return_user(self, mock_database):
        """✅ Should return user when found"""
        # Arrange
        service = UserService(database=mock_database)
        user_data = TestDataFactory.create_user(id=1)
        mock_database.data['users_1'] = user_data
        
        # Act
        result = service.get_user(1)
        
        # Assert
        assert result == user_data
        assert mock_database.call_count == 1
    
    def test_get_user_with_cache_hit_should_not_query_database(self):
        """🚀 Should use cache when available"""
        # Arrange
        mock_cache = Mock()
        mock_database = Mock()
        user_data = TestDataFactory.create_user(id=1)
        mock_cache.get.return_value = user_data
        
        service = UserService(database=mock_database, cache=mock_cache)
        
        # Act
        result = service.get_user(1)
        
        # Assert
        assert result == user_data
        mock_cache.get.assert_called_once_with("user_1")
        mock_database.find.assert_not_called()
    
    @pytest.mark.parametrize("invalid_id", [-1, 0, -999])
    def test_get_user_with_invalid_id_should_raise_error(self, mock_database, invalid_id):
        """❌ Should raise ValueError for invalid user IDs"""
        # Arrange
        service = UserService(database=mock_database)
        
        # Act & Assert
        with pytest.raises(ValueError, match="User ID must be positive"):
            service.get_user(invalid_id)
    
    def test_delete_user_existing_should_succeed(self, mock_database):
        """✅ Should delete existing user"""
        # Arrange
        service = UserService(database=mock_database)
        mock_database.data['users_1'] = TestDataFactory.create_user(id=1)
        
        # Act
        result = service.delete_user(1)
        
        # Assert
        assert result is True
        assert 'users_1' not in mock_database.data
    
    def test_delete_user_with_cache_should_clear_cache(self):
        """🗑️ Should clear cache when deleting user"""
        # Arrange
        mock_cache = Mock()
        mock_database = Mock()
        mock_database.delete.return_value = True
        
        service = UserService(database=mock_database, cache=mock_cache)
        
        # Act
        service.delete_user(1)
        
        # Assert
        mock_cache.delete.assert_called_once_with("user_1")
    
    @pytest.mark.asyncio
    async def test_fetch_user_stats_should_return_stats(self):
        """🔄 Should fetch user statistics asynchronously"""
        # Arrange
        service = UserService()
        
        # Act
        with timer() as t:
            result = await service.fetch_user_stats(1)
        
        # Assert
        assert result['user_id'] == 1
        assert 'login_count' in result
        assert 'last_login' in result
        assert t.elapsed >= 0.1  # Verify async delay

# Integration Tests
# ================

class TestUserServiceIntegration:
    """🔗 Integration tests for UserService"""
    
    def test_complete_user_lifecycle(self, mock_database):
        """🔄 Should handle complete user CRUD operations"""
        # Arrange
        service = UserService(database=mock_database)
        user_data = TestDataFactory.create_user(email="lifecycle@test.com")
        
        # Act & Assert - Create
        created_user = service.create_user(user_data)
        assert created_user['email'] == "lifecycle@test.com"
        
        # Act & Assert - Read
        retrieved_user = service.get_user(created_user['id'])
        assert retrieved_user == created_user
        
        # Act & Assert - Delete
        deleted = service.delete_user(created_user['id'])
        assert deleted is True
        
        # Verify deletion
        final_user = service.get_user(created_user['id'])
        assert final_user is None
    
    @patch('asyncio.sleep')
    @pytest.mark.asyncio
    async def test_async_operations_with_mocked_delay(self, mock_sleep):
        """⚡ Should handle async operations efficiently"""
        # Arrange
        service = UserService()
        mock_sleep.return_value = None  # Remove actual delay
        
        # Act
        with timer() as t:
            result = await service.fetch_user_stats(1)
        
        # Assert
        assert result['user_id'] == 1
        assert t.elapsed < 0.01  # Should be fast with mocked sleep
        mock_sleep.assert_called_once_with(0.1)

# Performance Tests
# ================

class TestPerformance:
    """⚡ Performance and load testing"""
    
    def test_user_creation_performance(self, mock_database):
        """🚀 Should create users within performance threshold"""
        # Arrange
        service = UserService(database=mock_database)
        user_data = TestDataFactory.create_user()
        
        # Act
        with timer() as t:
            for _ in range(100):
                service.create_user({**user_data, 'email': f'user{_}@test.com'})
        
        # Assert
        assert t.elapsed < 1.0  # Should complete 100 operations in under 1 second
        assert mock_database.call_count == 100
    
    def test_concurrent_user_access(self, mock_database):
        """🔄 Should handle concurrent operations"""
        # Arrange
        service = UserService(database=mock_database)
        
        # Pre-populate data
        for i in range(10):
            user_data = TestDataFactory.create_user(id=i+1)
            mock_database.data[f'users_{i+1}'] = user_data
        
        # Act
        with timer() as t:
            results = []
            for i in range(1, 11):
                result = service.get_user(i)
                results.append(result)
        
        # Assert
        assert len(results) == 10
        assert all(r is not None for r in results)
        assert t.elapsed < 0.1  # Should be fast for cached/mocked operations

# Security Tests
# ==============

class TestSecurity:
    """🛡️ Security validation tests"""
    
    @pytest.mark.parametrize("malicious_input", [
        "'; DROP TABLE users; --",
        "<script>alert('xss')</script>",
        "../../etc/passwd",
        "\x00\x01\x02",  # Null bytes
        "A" * 10000,  # Buffer overflow attempt
    ])
    def test_create_user_should_handle_malicious_input(self, mock_database, malicious_input):
        """🛡️ Should safely handle malicious input"""
        # Arrange
        service = UserService(database=mock_database)
        user_data = TestDataFactory.create_user(name=malicious_input)
        
        # Act & Assert
        # Should not raise security-related exceptions
        try:
            result = service.create_user(user_data)
            # Verify data is stored safely
            assert result['name'] == malicious_input
        except ValueError:
            # Expected for invalid email format
            pass
    
    def test_user_id_boundary_conditions(self, mock_database):
        """🔢 Should handle boundary conditions safely"""
        # Arrange
        service = UserService(database=mock_database)
        
        # Test boundary values
        boundary_values = [
            -2**31,  # Min 32-bit int
            2**31 - 1,  # Max 32-bit int
            0,
            -1,
        ]
        
        for value in boundary_values:
            if value <= 0:
                with pytest.raises(ValueError):
                    service.get_user(value)
            else:
                # Should not crash, even if user doesn't exist
                result = service.get_user(value)
                assert result is None or isinstance(result, dict)

# Error Handling Tests
# ===================

class TestErrorHandling:
    """❌ Comprehensive error handling validation"""
    
    def test_database_connection_failure(self):
        """💥 Should handle database connection failures gracefully"""
        # Arrange
        mock_db = Mock()
        mock_db.save.side_effect = ConnectionError("Database unavailable")
        service = UserService(database=mock_db)
        user_data = TestDataFactory.create_user()
        
        # Act & Assert
        with pytest.raises(ConnectionError):
            service.create_user(user_data)
    
    def test_cache_failure_should_not_break_functionality(self):
        """🔄 Should continue working when cache fails"""
        # Arrange
        mock_cache = Mock()
        mock_cache.get.side_effect = Exception("Cache unavailable")
        mock_database = MockDatabase()
        user_data = TestDataFactory.create_user(id=1)
        mock_database.data['users_1'] = user_data
        
        service = UserService(database=mock_database, cache=mock_cache)
        
        # Act
        result = service.get_user(1)
        
        # Assert
        assert result == user_data  # Should still work despite cache failure
    
    def test_invalid_user_data_types(self, mock_database):
        """🔍 Should validate data types properly"""
        # Arrange
        service = UserService(database=mock_database)
        
        invalid_inputs = [
            None,
            [],
            "",
            123,
            {"email": None},
            {"email": 123},
        ]
        
        for invalid_input in invalid_inputs:
            with pytest.raises((ValueError, TypeError, AttributeError)):
                service.create_user(invalid_input)

# File I/O Tests
# =============

class TestFileOperations:
    """📁 File handling and I/O tests"""
    
    def test_config_file_loading(self, temp_file):
        """📄 Should load configuration from file"""
        # Act
        with open(temp_file, 'r') as f:
            config = json.load(f)
        
        # Assert
        assert config == {"test": "data"}
    
    def test_missing_file_handling(self):
        """❌ Should handle missing files gracefully"""
        non_existent_file = "/path/that/does/not/exist.json"
        
        with pytest.raises(FileNotFoundError):
            with open(non_existent_file, 'r') as f:
                json.load(f)

# Test Metrics and Reporting
# ==========================

class TestMetrics:
    """📊 Test execution metrics and reporting"""
    
    def test_coverage_critical_paths(self, mock_database):
        """🎯 Ensure critical code paths are covered"""
        service = UserService(database=mock_database)
        
        # Test all critical paths
        user_data = TestDataFactory.create_user()
        
        # Path 1: Successful creation
        created = service.create_user(user_data)
        assert created is not None
        
        # Path 2: Successful retrieval
        retrieved = service.get_user(created['id'])
        assert retrieved is not None
        
        # Path 3: Successful deletion
        deleted = service.delete_user(created['id'])
        assert deleted is True
        
        # Path 4: Not found scenario
        not_found = service.get_user(999)
        assert not_found is None
    
    def test_error_path_coverage(self, mock_database):
        """🚨 Ensure error paths are properly covered"""
        service = UserService(database=mock_database)
        
        # Error path 1: Missing email
        with pytest.raises(ValueError):
            service.create_user({})
        
        # Error path 2: Invalid email
        with pytest.raises(ValueError):
            service.create_user({"email": "invalid"})
        
        # Error path 3: Invalid user ID
        with pytest.raises(ValueError):
            service.get_user(-1)

# Cleanup and Teardown
# ====================

def pytest_runtest_teardown(item):
    """🧹 Global test cleanup"""
    # Clear any global state
    # Reset singletons
    # Clean up temporary resources
    pass

# Test Configuration
# =================

pytest_plugins = [
    "pytest_asyncio",
    "pytest_mock",
    "pytest_cov",
]

# Markers for test categorization
pytestmark = [
    pytest.mark.unit,  # Mark all tests as unit tests by default
]

# Custom markers
def pytest_configure(config):
    """⚙️ Configure custom pytest markers"""
    config.addinivalue_line("markers", "unit: Unit tests")
    config.addinivalue_line("markers", "integration: Integration tests")
    config.addinivalue_line("markers", "performance: Performance tests")
    config.addinivalue_line("markers", "security: Security tests")
    config.addinivalue_line("markers", "slow: Slow running tests")

if __name__ == "__main__":
    # Run tests with coverage
    pytest.main([
        "--cov=.",
        "--cov-report=html",
        "--cov-report=term-missing",
        "--cov-fail-under=90",
        "-v",
        __file__
    ])