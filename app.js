require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');
const app = express();
app.use(express.json());
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE
});

db.connect((err) => {
    if (err) {
      console.error('Error connecting to database:', err);
      process.exit(1);
    }
    console.log('Connected to MySQL database!');
    const sql = 'create table if not exists products (id INT AUTO_INCREMENT PRIMARY KEY, \
                    name VARCHAR(255), \
                    price DECIMAL(10,2), \
                    discount DECIMAL(10,2), \
                    review_count INT, \
                    image_url TEXT)';
    db.query(sql, function(err, result) {
        if (err) throw err;
        console.log("Table created!");
        const checkData = 'SELECT COUNT(*) AS count FROM products';
        db.query(checkData, function (err, results) {
            if (err) throw err;
            const count = results[0].count;

            // ถ้าไม่มีข้อมูล ค่อย insert
            if (count === 0) {
                const insertValues = `INSERT INTO products (name, price, discount, review_count, image_url) VALUES 
                    ('เสื้อยืดคอกลมสีขาว', 299.00, 50.00, 125, 'https://example.com/images/shirt-white.jpg'),
                    ('กางเกงยีนส์ผู้ชาย', 899.00, 100.00, 88, 'https://example.com/images/jeans-men.jpg'),
                    ('รองเท้าผ้าใบแฟชั่น', 1290.00, 200.00, 240, 'https://example.com/images/sneakers.jpg'),
                    ('หมวกแก๊ปลายกราฟิก', 199.00, 20.00, 32, 'https://example.com/images/cap.jpg'),
                    ('กระเป๋าสะพายข้าง', 599.00, 150.00, 59, 'https://example.com/images/bag.jpg')`;

                db.query(insertValues, function (err, result) {
                    if (err) throw err;
                    console.log("Initial products inserted.");
                });
            } else {
                console.log("Products already exist, skipping insert.");
            }
        })
    })
});
  
db.on('error', (err) => {
    console.error('Database error', err);
});

app.get('/products', (req, res) => {
    const sql = 'select * FROM products where is_deleted = 0';
    db.query(sql, (err, result) => {
        if (err) {
            res.status(500).json({ message: 'Error occurred while retrieving products.', error: err});
        } else {
            res.status(200).json(result);
        }
    });
});

app.get('/products/:id', (req, res) => {
    const id = Number(req.params.id);
    const sql = 'select * FROM products where id = ? and is_deleted = 0';
    db.query(sql, [id], (err, result) => {
        if (err) {
            res.status(500).json({ message: 'Error occurred while retrieving products.', error: err});
        } else {
            if (result.length === 0) {
                res.status(404).json({ message: 'Product not found.'});
            } else {
                res.status(200).json({ message: 'Product retrieved successfully', data: result});
            }
        }
    });
});

app.get('/products/search/:keyword', (req, res) => {
    const keyword = req.params.keyword;
    const sql = 'select * FROM products WHERE name LIKE ? and is_deleted = 0';
    db.query(sql, [`%${keyword}%`], (err, result) => {
        if (err) {
            res.status(500).json({ message: 'Error occurred while retrieving products.', error: err});
        } else {
            res.status(200).json(result);
        }
    });
});

app.post('/products', (req, res) => {
    const { name, price, discount, review_count, image_url } = req.body;
    db.query(
        `insert into products (name, price, discount, review_count, image_url) values (?, ?, ?, ?, ?)`,
        [name, price, discount, review_count, image_url],
        (err, result) => {
            if (err) return res.status(500).json({error: err.message});
            res.status(201).json({id: result.insertId, message: `Product created`});
        }
    );
})

app.put('/products/:id', (req, res) => {
    const { name, price, discount, review_count, image_url } = req.body;
    db.query(
        `update products set name = ?, price = ?, discount = ?, review_count = ?, image_url = ? where id = ?`,
        [name, price, discount, review_count, image_url, req.params.id], 
        (err) => {
            if (err) return res.status(500).json({error : err.message});
            res.json({message: 'Product updated'})
        }
    )
})

app.delete('/products/:id', (req, res) => {
    db.query(
        `update products set is_deleted = 1 where id = ?`,
        [req.params.id],
        (err) => {
            if (err) return res.status(500).json({error: err.message});
            res.json({message: 'Product soft-deleted'});
        }
    )
})

app.put('/products/restore/:id', (req, res) => {
    db.query(
        `update products set is_deleted = 0 where id = ?`,
        [req.params.id],
        (err) => {
            if (err) return res.status(500).json({error: err.message});
            res.json({message: 'Product restored'});
        }
    )
})

app.listen(3000, () => console.log('Server running on port 3000'))