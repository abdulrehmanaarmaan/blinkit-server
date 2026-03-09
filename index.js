const express = require('express')
const cors = require('cors')
const app = express()
require('dotenv').config()
const port = process.env.PORT || 3000
app.use(cors())
app.use(express.json())

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.n8udp2w.mongodb.net/?appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {

        const database = client.db('blinkit-user')

        const products = database.collection('products')
        const cart = database.collection('cart')
        const orders = database.collection('orders')

        app.get('/products', async (req, res) => {
            const { id, page, limit, search, category } = req.query;

            // 1. Single Product by ID (Priority)
            if (id) {
                const result = await products.findOne({ _id: new ObjectId(id) });
                return res.send(result);
            }

            // 2. Build Dynamic Query Object
            let query = {};

            // Filter by Category (Exact match)
            if (category && category !== 'All') {
                query.category = category;
            }

            // Search by Name (Case-insensitive partial match)
            if (search) {
                query.name = { $regex: search, $options: 'i' };
            }

            // 3. Pagination Setup
            const pageNumber = parseInt(page) || 1;
            const limitNumber = parseInt(limit) || 12;
            const skip = (pageNumber - 1) * limitNumber;

            // 4. Fetch Data with Filters + Pagination
            const result = await products.find(query)
                .skip(skip)
                .limit(limitNumber)
                .toArray();

            // 5. Count only the items matching the query
            const totalProducts = await products.countDocuments(query);

            res.send({
                products: result,
                totalProducts,
                totalPages: Math.ceil(totalProducts / limitNumber),
                currentPage: pageNumber
            });
        });

        app.post('/cart', async (req, res) => {

            const product = req.body;

            const { name, quantity, stock } = product

            const query = { name }

            const addedProduct = await cart.findOne(query)

            if (addedProduct) {

                if (quantity) {

                    if (quantity <= stock) {

                        const updatedProduct = {
                            $set: {
                                quantity: quantity,
                            }
                        }

                        const result = await cart.updateOne(query, updatedProduct)
                        return res.send(result)
                    }
                }

                else {
                    return res.status(409).send({ message: `Only ${stock} units available.` })
                }
            }

            const result = await cart.insertOne(product)
            res.send(result)
        })

        app.get('/cart', async (req, res) => {

            const { name } = req.query

            if (name) {
                const query = { name }

                const result = await cart.findOne(query)

                if (result) {
                    return res.send(result)
                }
            }

            const result = await cart.find().toArray()
            res.send(result)
        })

        app.get('/cart', async (req, res) => {
            const result = await cart.find().toArray()
            res.send(result)
        })

        app.delete('/cart', async (req, res) => {
            const { id } = req.query

            if (id) {

                const query = { _id: new ObjectId(id) }

                const result = await cart.deleteOne(query)
                return res.send(result)
            }

            const result = await cart.deleteMany()
            res.send(result)
        })

        app.patch('/cart/:id', async (req, res) => {
            const { id } = req.params
            const query = { _id: new ObjectId(id) }

            const addedProduct = await cart.findOne(query)

            if (addedProduct) {
                const { quantity, stock } = addedProduct

                const { operation } = req.body

                if (operation === 'dec' && quantity === 1) {

                    const result = await cart.deleteOne(query)
                    return res.send(result)
                }

                if (operation === 'inc' && quantity < stock) {

                    const updatedProduct = {
                        $inc: {
                            quantity: 1
                        }
                    }

                    const result = await cart.updateOne(query, updatedProduct)
                    return res.send(result)
                }

                else {
                    const updatedProduct = {
                        $inc: {
                            quantity: -1
                        }
                    }

                    const result = await cart.updateOne(query, updatedProduct)
                    return res.send(result)
                }
            }
        })

        app.post('/orders', async (req, res) => {
            const order = req.body;
            const { products } = order;

            if (products.length === 0) {
                return res.status(400).send({ message: "No products in order" });
            }

            try {
                // 1. Insert the order record
                const result = await orders.insertOne(order);

                if (result?.insertedId) {
                    const productsCollection = database.collection('products');

                    // 2. Prepare Bulk Operations using 'name' as the unique identifier
                    const bulkOps = products.map(product => ({
                        updateOne: {
                            // We filter by name because it's the unique string we have
                            filter: { name: product.name },
                            update: { $inc: { stock: -product.quantity } }
                        }
                    }));

                    // 3. Execute the stock update
                    await productsCollection.bulkWrite(bulkOps);

                    return res.send(result);
                }
            } catch (error) {
                console.error("Order process failed:", error);
                return res.status(500).send({ message: "Failed to place order", error: error.message });
            }
        });

        app.get('/orders/:id', async (req, res) => {

            const { id } = req.params
            const query = { _id: new ObjectId(id) }

            const result = await orders.findOne(query)
            res.send(result)
        })

        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally { }
}
run().catch(console.dir);

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})
