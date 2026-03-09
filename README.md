# Blinkit API - Express 5 & MongoDB

This server handles the core business logic, including product distribution and inventory integrity.

### 📊 Sample Data
- **File:** `products.json`
- **Use:** This file contains 20 sample products across various categories (Juices, Soft Drinks, etc.) to seed your database.

### API Endpoints

#### Products
- `GET /products`: Supports pagination (`page`, `limit`), search (`search`), and category filtering.
- `GET /products?id=...`: Fetches a single product by its ObjectId.

#### Cart
- `GET /cart`: Fetches all cart items or a specific item by name.
- `POST /cart`: Adds/updates items with stock-level validation.
- `PATCH /cart/:id`: Increments/decrements quantity or removes item if count reaches zero.
- `DELETE /cart`: Clears the entire cart or a specific item.

#### Orders
- `POST /orders`: Processes checkout and executes bulk stock updates.
- `GET /orders/:id`: Retrieves order summary for the success page.