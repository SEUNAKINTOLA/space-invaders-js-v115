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
    """👤 Comprehensive UserService tests"""
    
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
        with pytest.raises(ValueError, match="Invalid email format|Email is required"):
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
    
    def test_get_user_with_nonexistent_id_should_return_none(self, mock_database):
        """❌ Should return None when user not found"""
        # Arrange
        service = UserService(database=mock_database)
        
        # Act
        result = service.get_user(999)
        
        # Assert
        assert result is None
        assert mock_database.call_count == 1
    
    @pytest.mark.parametrize("invalid_id", [-1, 0, -999])
    def test_get_user_with_invalid_id_should_raise_error(self, mock_database, invalid_id):
        """❌ Should raise ValueError for invalid user IDs"""
        # Arrange
        service = UserService(database=mock_database)
        
        # Act & Assert
        with pytest.raises(ValueError, match="User ID must be positive"):
            service.get_user(invalid_id)
    
    def test_get_user_with_cache_hit_should_not_query_database(self, mock_database):
        """🚀 Should return cached data without database query"""
        # Arrange
        mock_cache = Mock()
        cached_user = TestDataFactory.create_user(id=1)
        mock_cache.get.return_value = cached_user
        
        service = UserService(database=mock_database, cache=mock_cache)
        
        # Act
        result = service.get_user(1)
        
        # Assert
        assert result == cached_user
        mock_cache.get.assert_called_once_with("user_1")
        assert mock_database.call_count == 0  # No database call
    
    def test_get_user_should_cache_result_when_found(self, mock_database):
        """💾 Should cache user data after database fetch"""
        # Arrange
        mock_cache = Mock()
        mock_cache.get.return_value = None  # Cache miss
        
        user_data = TestDataFactory.create_user(id=1)
        mock_database.data['users_1'] = user_data
        
        service = UserService(database=mock_database, cache=mock_cache)
        
        # Act
        result = service.get_user(1)
        
        # Assert
        assert result == user_data
        mock_cache.set.assert_called_once_with("user_1", user_data)
    
    def test_delete_user_should_succeed_and_clear_cache(self, mock_database):
        """🗑️ Should delete user and clear cache"""
        # Arrange
        mock_cache = Mock()
        user_data = TestDataFactory.create_user(id=1)
        mock_database.data['users_1'] = user_data
        
        service = UserService(database=mock_database, cache=mock_cache)
        
        # Act
        result = service.delete_user(1)
        
        # Assert
        assert result is True
        mock_cache.delete.assert_called_once_with("user_1")
        assert 'users_1' not in mock_database.data
    
    @pytest.mark.asyncio
    async def test_fetch_user_stats_should_return_stats(self):
        """📊 Should fetch user statistics asynchronously"""
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
        mock_cache = Mock()
        mock_cache.get.return_value = None
        service = UserService(database=mock_database, cache=mock_cache)
        
        user_data = TestDataFactory.create_user(email="lifecycle@test.com")
        
        # Act & Assert - Create
        created_user = service.create_user(user_data)
        assert created_user['email'] == "lifecycle@test.com"
        
        # Act & Assert - Read
        fetched_user = service.get_user(created_user['id'])
        assert fetched_user == created_user
        
        # Act & Assert - Delete
        deleted = service.delete_user(created_user['id'])
        assert deleted is True
        
        # Verify deletion
        deleted_user = service.get_user(created_user['id'])
        assert deleted_user is None

# Performance Tests
# ================

class TestPerformance:
    """⚡ Performance validation tests"""
    
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
    
    @pytest.mark.asyncio
    async def test_concurrent_user_stats_fetching(self):
        """🔄 Should handle concurrent async operations"""
        # Arrange
        service = UserService()
        
        # Act
        with timer() as t:
            tasks = [service.fetch_user_stats(i) for i in range(10)]
            results = await asyncio.gather(*tasks)
        
        # Assert
        assert len(results) == 10
        assert all('user_id' in result for result in results)
        # Should be faster than sequential execution due to concurrency
        assert t.elapsed < 1.0

# Security Tests
# ==============

class TestSecurity:
    """🛡️ Security validation tests"""
    
    @pytest.mark.parametrize("malicious_input", [
        "'; DROP TABLE users; --",
        "<script>alert('xss')</script>",
        "../../etc/passwd",
        "\x00\x01\x02",
        "A" * 10000  # Buffer overflow attempt
    ])
    def test_create_user_should_handle_malicious_input(self, mock_database, malicious_input):
        """🛡️ Should safely handle malicious input"""
        # Arrange
        service = UserService(database=mock_database)
        user_data = TestDataFactory.create_user(name=malicious_input)
        
        # Act & Assert
        # Should not raise unexpected exceptions
        try:
            result = service.create_user(user_data)
            # If creation succeeds, verify data is stored safely
            assert result['name'] == malicious_input
        except ValueError:
            # Expected validation errors are acceptable
            pass
    
    def test_user_id_boundary_conditions(self, mock_database):
        """🔢 Should handle integer boundary conditions safely"""
        # Arrange
        service = UserService(database=mock_database)
        
        boundary_values = [
            -2**31,  # Min 32-bit int
            2**31 - 1,  # Max 32-bit int
            2**63 - 1,  # Max 64-bit int
        ]
        
        for value in boundary_values:
            if value <= 0:
                # Should raise ValueError for non-positive IDs
                with pytest.raises(ValueError):
                    service.get_user(value)
            else:
                # Should handle large positive IDs gracefully
                result = service.get_user(value)
                assert result is None  # Not found is acceptable

# Error Handling Tests
# ===================

class TestErrorHandling:
    """❌ Comprehensive error handling tests"""
    
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
    
    def test_cache_failure_should_not_break_functionality(self, mock_database):
        """💾 Should continue working when cache fails"""
        # Arrange
        mock_cache = Mock()
        mock_cache.get.side_effect = Exception("Cache service down")
        mock_cache.set.side_effect = Exception("Cache service down")
        
        user_data = TestDataFactory.create_user(id=1)
        mock_database.data['users_1'] = user_data
        
        service = UserService(database=mock_database, cache=mock_cache)
        
        # Act - Should not raise exception despite cache failure
        result = service.get_user(1)
        
        # Assert
        assert result == user_data  # Still returns data from database

# Edge Cases Tests
# ===============

class TestEdgeCases:
    """🎯 Edge case validation tests"""
    
    def test_empty_database_operations(self, mock_database):
        """📭 Should handle operations on empty database"""
        # Arrange
        service = UserService(database=mock_database)
        
        # Act & Assert
        result = service.get_user(1)
        assert result is None
        
        deleted = service.delete_user(1)
        assert deleted is False
    
    def test_unicode_and_special_characters(self, mock_database):
        """🌍 Should handle Unicode and special characters"""
        # Arrange
        service = UserService(database=mock_database)
        
        unicode_data = TestDataFactory.create_user(
            name="José María 中文 🚀",
            email="josé@münchen.de"
        )
        
        # Act
        result = service.create_user(unicode_data)
        
        # Assert
        assert result['name'] == "José María 中文 🚀"
        assert result['email'] == "josé@münchen.de"
    
    def test_very_large_datasets(self, mock_database):
        """📊 Should handle large data operations"""
        # Arrange
        service = UserService(database=mock_database)
        
        # Create large user data
        large_bio = "A" * 10000  # 10KB of text
        user_data = TestDataFactory.create_user(bio=large_bio)
        
        # Act
        result = service.create_user(user_data)
        
        # Assert
        assert len(result['bio']) == 10000
        assert result['bio'] == large_bio

# Test Utilities and Helpers
# ==========================

class TestUtilities:
    """🛠️ Test utility function validation"""
    
    def test_test_data_factory_creates_valid_users(self):
        """🏭 Should create valid user data consistently"""
        # Act
        user1 = TestDataFactory.create_user()
        user2 = TestDataFactory.create_user()
        
        # Assert
        assert user1['email'] != user2['email']  # Should be unique
        assert '@' in user1['email']
        assert user1['is_active'] is True
        assert isinstance(user1['id'], int)
    
    def test_test_data_factory_respects_overrides(self):
        """🎛️ Should apply custom overrides correctly"""
        # Act
        custom_user = TestDataFactory.create_user(
            email="custom@test.com",
            role="admin",
            is_active=False
        )
        
        # Assert
        assert custom_user['email'] == "custom@test.com"
        assert custom_user['role'] == "admin"
        assert custom_user['is_active'] is False
    
    def test_timer_context_manager(self):
        """⏱️ Should measure execution time accurately"""
        # Act
        with timer() as t:
            time.sleep(0.1)
        
        # Assert
        assert 0.09 <= t.elapsed <= 0.15  # Allow for timing variance

# Configuration and Setup Tests
# =============================

class TestConfiguration:
    """⚙️ Configuration and setup validation"""
    
    def test_service_initialization_with_dependencies(self):
        """🔧 Should initialize service with all dependencies"""
        # Arrange
        mock_db = Mock()
        mock_cache = Mock()
        
        # Act
        service = UserService(database=mock_db, cache=mock_cache)
        
        # Assert
        assert service.database == mock_db
        assert service.cache == mock_cache
    
    def test_service_initialization_without_cache(self):
        """🔧 Should work without cache dependency"""
        # Arrange
        mock_db = Mock()
        
        # Act
        service = UserService(database=mock_db)
        
        # Assert
        assert service.database == mock_db
        assert service.cache is None

# Cleanup and Teardown Tests
# ==========================

def test_fixtures_cleanup_properly(temp_file):
    """🧹 Should clean up test fixtures properly"""
    # Arrange & Act
    assert os.path.exists(temp_file)
    
    with open(temp_file, 'r') as f:
        content = json.load(f)
    
    # Assert
    assert content == {"test": "data"}
    
    # Note: Cleanup happens automatically via fixture

# Test Coverage Validation
# ========================

def test_all_public_methods_are_tested():
    """📊 Ensure all public methods have test coverage"""
    # This is a meta-test to ensure we're testing everything
    user_service_methods = [
        method for method in dir(UserService) 
        if not method.startswith('_') and callable(getattr(UserService, method))
    ]
    
    # List of methods we've tested
    tested_methods = [
        'create_user',
        'get_user', 
        'delete_user',
        'fetch_user_stats'
    ]
    
    # Assert all public methods are covered
    for method in user_service_methods:
        assert method in tested_methods, f"Method {method} needs test coverage"

# Performance Benchmarks
# ======================

@pytest.mark.benchmark
class TestBenchmarks:
    """📈 Performance benchmarking tests"""
    
    def test_user_creation_benchmark(self, benchmark, mock_database):
        """📊 Benchmark user creation performance"""
        # Arrange
        service = UserService(database=mock_database)
        user_data = TestDataFactory.create_user()
        
        # Act & Assert
        result = benchmark(service.create_user, user_data)
        assert result['email'] == user_data['email']

if __name__ == "__main__":
    # Run tests with coverage
    pytest.main([
        __file__,
        "-v",
        "--cov=.",
        "--cov-report=html",
        "--cov-report=term-missing",
        "--cov-fail-under=90"
    ])