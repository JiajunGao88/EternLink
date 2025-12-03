#!/usr/bin/bash

# Test CRUD operations for user management API
BASE_URL="http://localhost:3001"
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2Y2JkMDEwNS0wYTZjLTRkZmMtODIyNC03NzI2MGQ1ZWZlYTIiLCJ3YWxsZXRBZGRyZXNzIjoidGVzdHVzZXJAZXhhbXBsZS5jb20iLCJpYXQiOjE3NjQ3NTMxMjUsImV4cCI6MTc2NTM1NzkyNX0.Na1HucWNQ6lrG7gP-00NT7pF4OqIwYUeQ1zCmUs1LwI"

echo "========== Testing User CRUD API =========="
echo ""

# Test 1: READ - Get current user
echo "1. GET /api/users/me - Get current user"
curl -s -X GET "$BASE_URL/api/users/me" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | python -m json.tool 2>/dev/null || curl -s -X GET "$BASE_URL/api/users/me" -H "Authorization: Bearer $TOKEN"
echo -e "\n"

# Test 2: READ - Get all users (with pagination)
echo "2. GET /api/users?page=1&limit=5 - Get all users"
curl -s -X GET "$BASE_URL/api/users?page=1&limit=5" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | python -m json.tool 2>/dev/null || curl -s -X GET "$BASE_URL/api/users?page=1&limit=5" -H "Authorization: Bearer $TOKEN"
echo -e "\n"

# Test 3: UPDATE - Update current user
echo "3. PUT /api/users/me - Update current user"
curl -s -X PUT "$BASE_URL/api/users/me" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"phoneNumber\":\"+1234567890\",\"emailNotificationDays\":14}" | python -m json.tool 2>/dev/null || curl -s -X PUT "$BASE_URL/api/users/me" -H "Authorization: Bearer $TOKEN" -d "{\"phoneNumber\":\"+1234567890\",\"emailNotificationDays\":14}"
echo -e "\n"

# Test 4: READ - Get user by ID
echo "4. GET /api/users/{id} - Get user by ID"
USER_ID="6cbd0105-0a6c-4dfc-8224-77260d5efea2"
curl -s -X GET "$BASE_URL/api/users/$USER_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | python -m json.tool 2>/dev/null || curl -s -X GET "$BASE_URL/api/users/$USER_ID" -H "Authorization: Bearer $TOKEN"
echo -e "\n"

# Test 5: CREATE - Register a beneficiary
echo "5. POST /api/registration/register - Create beneficiary account"
REFER_CODE="NFENFIJH87LA"
curl -s -X POST "$BASE_URL/api/registration/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"beneficiary@example.com\",\"password\":\"Password123\",\"accountType\":\"beneficiary\",\"referCode\":\"$REFER_CODE\"}" | python -m json.tool 2>/dev/null || curl -s -X POST "$BASE_URL/api/registration/register" -d "{\"email\":\"beneficiary@example.com\",\"password\":\"Password123\",\"accountType\":\"beneficiary\",\"referCode\":\"$REFER_CODE\"}"
echo -e "\n"

# Test 6: READ - Filter users by accountType
echo "6. GET /api/users?accountType=user - Filter by account type"
curl -s -X GET "$BASE_URL/api/users?accountType=user&page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | python -m json.tool 2>/dev/null || curl -s -X GET "$BASE_URL/api/users?accountType=user&page=1&limit=10" -H "Authorization: Bearer $TOKEN"
echo -e "\n"

echo "========== CRUD Tests Completed =========="
