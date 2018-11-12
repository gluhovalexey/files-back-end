const express = require('express');
const app = express();
const md5 = require('md5');
//
const multer = require('multer');
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './public');
    },
    filename: function (req, file, cb) {
        cb(null, md5(Date.now() + file.originalname) + file.originalname.substring(file.originalname.lastIndexOf('.')));
    }
});
const upload = multer({ storage: storage }).single('file');
//
const MongoClient = require('mongodb').MongoClient;
const user = encodeURIComponent('user2');
const password = encodeURIComponent('userpass');
const url = `mongodb://${user}:${password}@188.128.30.104:27027/test2`;
const dbName = 'test2';
const objectId = require("mongodb").ObjectID;

app.use('/public', express.static('public'));

// CORS OPTIONS
app.options("/api/file/*", function(req, res) {
    res.header('Access-Control-Allow-Origin', 'http://localhost:4200');
    res.header('Access-Control-Allow-Methods', 'POST, GET, DELETE, OPTIONS');
    res.status(200).end();
});

/**
 * Получение списка файлов
 */
 app.get('/api/file/list', function(req, res) {
    const client = new MongoClient(url);
    res.header('Access-Control-Allow-Origin', 'http://localhost:4200');
    client.connect(function(err, client){
        err && res.status(500).send('database connection error');
        const db = client.db(dbName);
        const col = db.collection('files');

        col.find({deleted: {$exists: false}}).sort([['date', 1]]).toArray(function(err, files) {
            err && res.status(500).send();
            (files.length !== 0) ? res.status(200).send(files) : res.status(404).send('Files not found');
            client.close();
        });
    });
});

/**
 * Загрузка файла на сервер
 */
 app.post('/api/file/upload', function(req, res) {
    res.header('Access-Control-Allow-Origin', 'http://localhost:4200');

    upload(req, res, function(err) {
        if (err instanceof multer.MulterError) {
             res.status(500).send('upload error');
        }

        const client = new MongoClient(url);
        var file = req.file;   
        var fileRow = {
            'fileName': file && file.originalname.substring(file.originalname.lastIndexOf('.'), 0) || null,
            'size': file && file.size || null,
            'path': file && file.path || null,
            'contentType': file && file.mimetype.split('/') || null,
            'date': new Date()
        };

        client.connect(function(err, client){
            err && res.status(500).send('database connection error');

            const db = client.db(dbName);
            const col = db.collection('files');

            col.insertOne(fileRow, function(err, r) {
                err && res.status(500).send();
                res.status(201).send({message: 'Document uploaded'});
                client.close();
            });
        });
    });    
});

/**
 * Удаление файла
 */
 app.delete('/api/file/delete/:id', function(req, res) {
    res.header('Access-Control-Allow-Origin', 'http://localhost:4200');
    const client = new MongoClient(url);
    var id = new objectId(req.params.id);

    client.connect(function(err, client){
        err && res.status(500).send('database connection error');

        const db = client.db(dbName);
        const col = db.collection('files');    

        col.updateOne({'_id': id}, {$set: {deleted: true}}, function(err, r) {
            err && res.status(500).send();
            res.status(200).send({message: 'Document deleted'});
            client.close();
        });
    });
});

 app.listen(3000);