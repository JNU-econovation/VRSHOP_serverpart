var express = require('express');
var http = require('http');
var static = require('serve-static');
var path = require('path');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var expressSession = require('express-session');
var expressErrorHandler = require('express-error-handler');
var mysql = require('mysql');
var pool = mysql.createPool({
    coonectionLimit:10,
    host:'localhost',
    user:'root',
    password:'1111',
    database: 'vrshop',
    debug:false
});

var app = express();

app.set('port', process.env.PORT || 3000);
app.use('/public', static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({extended:false}));
app.use(bodyParser.json());
app.use(cookieParser());
app.use(expressSession({
    secret:'my key',
    resave:true,
    saveUninitialized:true
}));


var router = express.Router();

var addUser = function(id, password, wallet, name, address, phone, callback){
    console.log('add user called');
    
    pool.getConnection(function(err, conn){
        if(err){
            if(conn){
                conn.release();
            }
            callback(err, null);
            return;
        }
        console.log('database connected thread id : ' + conn.threadId);
        
        var data = {id:id, password:password,
        wallet:wallet, name:name, address:address, phone:phone};
        
        var exec = conn.query('insert into users set?', data, function(err, result){
            conn.release();
            console.log('sql : ' + exec.sql);
            
            if(err){
                console.log('error in sql exe');
                console.dir(err);
                callback(err, null);
                return;
            }
            callback(null, result);
        });
    })
};

//router1 login router
router.route('/process/login').post(function(req, res){
    console.log('login router ... ');
    
    var paramId = req.body.id || req.query.id;
    var paramPassword = req.body.password || req.query.password;
    
    console.log('param : ' + paramId + ',' + paramPassword);
    
    authUser(paramId, paramPassword, function(err, rows){
        if(err){
            console.log('error');
            res.writeHead(200,{"Content-Type":"html;charset=utf8"});
            res.write('<h1>error occured</h1>');
            return;
        }
        if(rows){
            console.dir(rows);
            res.writeHead(200,{"Content-Type":"html;charset=utf8"});
            res.write('<p>welcome! ' + rows[0].name + '</p>');
            res.write('<br><br><a href="/public/login.html">re login</a>');
            res.end();
            return;
        }else{
                console.log('error');
                res.writeHead(200, {"Content-Type":"html;charset=utf8"});
                res.write('<h1>Login Failed</h1>');
            }
    })
})


//router2 adduser router
router.route('/process/adduser').post(function(req, res){
    console.log('adduser router ... ');
    
    var paramId = req.body.id || req.query.id;
    var paramPassword = req.body.password || req.query.password;
    var paramWallet = req.body.wallet || req.query.wallet;
    var paramName = req.body.name || req.query.name;
    var paramAddress = req.body.address || req.query.address;
    var paramPhone = req.body.phone || req.query.phone;
    
    console.log('called param : ' + paramId + ',' + paramPassword + ',' + paramWallet);
    
    if(pool){
        addUser(paramId, paramPassword, paramWallet, paramName, paramAddress, paramPhone,  function(err, addedUser){
            if(err){
                console.log('error');
                res.writeHead(200, {"Content-Type":"html;charset=utf8"});
                res.write('<h1>error ouccurred</h1>');
                res.end();
                return;
            }
            if(addedUser){
                console.dir(addedUser);
                res.writeHead(200, {"Content-Type":"html;charset=utf8"});
                res.write('<h1>user created</h1>');
                res.end();
            }else{
                console.log('error');
                res.writeHead(200, {"Content-Type":"html;charset=utf8"});
                res.write('<h1>add user failed</h1>');
                res.end(); 
            }
        })
    }else{
        res.writeHead(200,{"Content-Type:":"html;charset=utf8"});
        res.write('<h2>DATABASE CONNECTION FAIL</h2>');
        res.end();
    }
});

var authUser = function(id, password, callback){
    console.log('authUser called : ' + id + ',' + password);
    
    pool.getConnection(function(err, conn){
        if(err){
            if(conn){
                conn.release();
            }
            callback(err, null);
            return;
        }
        console.log('DATABASE CONNECTED');
        
        var tablename = 'users';
        var cols = ['id', 'wallet','name','phone','address'];
        var exec = conn.query("SELECT ?? FROM ?? WHERE id = ? and password = ?", [cols, tablename, id, password], function(err, rows){
            conn.release();
            console.log('EXECUTED SQL >>' + exec.sql);
            
            if(err){
                callback(err, null);
                return;
            }
            
            if(rows.length>0){
                console.log('FOUND USER');
                callback(null, rows);
            }else{
                console.log('NOT FOUND USER');
                callback(null, null);
            }
        });
    })
}

var errorHandler = expressErrorHandler({
    static:{
        '404':'./public/404.html'
    }
})

app.use('/', router);
app.use(expressErrorHandler.httpError(404));
app.use(errorHandler);
var server = http.createServer(app).listen(app.get('port'), function(req, res){
    console.log('server running via : ' + app.get('port'));
});






