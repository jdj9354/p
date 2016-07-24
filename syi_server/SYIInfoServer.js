var express = require('express');
var fs = require('fs');
var path = require('path');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);
var cors = require('cors');
var DBModule = require('./MySqlModule');


var corsOptions = {
origin: 'http://localhost',
credentials : true
};


io.on('connection', function (socket) {	
	socket.on('reqInfo', function (data) {
		var SnsType = data.snstype; 
		var SnsId = data.snsid;
		DBModule.GetUserInfo(SnsType,SnsId,socket);
	});
	socket.on('reqInfoU', function (data) {
		var uuid = data.uuid; 		
		console.log(uuid);
		DBModule.GetUserInfoByUUID(uuid,socket);
	});
	socket.on('renewLogin', function (data) {
		var uuid = data.uuid; 		
		var timestamp = (new Date()).getTime();
		console.log(uuid);
		DBModule.RenewLoginInfo(uuid,timestamp,socket);
	});
	socket.on('saveInfo', function (data) {		
		var jsonProfileInfo = {uuid : data.id,
						name : data.name,
						nickname : data.nickname,
						age : data.age,
						sex : data.sex,
						height : data.height,
						region : data.region,
						religion : data.religion,
						bloodgroups : data.bloodgroups,
						keyword1 : data.keyword1,
						keyword2 : data.keyword2,
						keyword3 : data.keyword3
						};
		var jsonLoginInfo = {uuid : data.id,
							snstype : data.snstype,
							snsid : data.snsid				
							};
		DBModule.AddUserAsync(jsonProfileInfo,jsonLoginInfo,socket);
	});
	socket.on('changeInfo', function (data) {
		var jsonProfileInfo = {uuid : data.id,
						name : data.name,
						nickname : data.nickname,
						age : data.age,
						height : data.height,
						region : data.region,
						religion : data.religion,
						bloodgroups : data.bloodgroups,
						keyword1 : data.keyword1,
						keyword2 : data.keyword2,
						keyword3 : data.keyword3
						};
		var jsonLoginInfo = {uuid : data.id,
							snstype : data.snstype,
							snsid : data.snsid				
							};
		DBModule.ChangeUserInfoAsync(jsonProfileInfo,jsonLoginInfo,socket);
	});
	socket.on('search', function (data) {
		var SnsType = data.snstype; 
		var SnsId = data.snsid;
		DBModule.searchRandomUser(SnsType,SnsId,socket);		
	});
	socket.on('sendok', function (data) {	
		DBModule.AddMatchingInfoAsync(data,socket);		
	});
	socket.on('replyok', function (data) {	
		DBModule.ToggleMatchingInfoAsync(data,socket);		
	});
	socket.on('getMatchingAll', function (data) {	
		var ruuid = data.ruuid; 		
		DBModule.GetAllMatchingInfoAsync(ruuid,socket);		
	});
	socket.on('getMatchedAll', function (data) {	
		var uuid = data.uuid; 		
		DBModule.GetAllMatchedInfoAsync(uuid,socket);		
	});
	
	socket.on('send_payment_info', function(data){	
		DBModule.InitPaymentInfo(data,socket);
	});
	
	socket.on('ipn_result', function (data) {	
		console.log(data);
	});	
});



app.use(express.static(__dirname));
app.use(express.bodyParser());
app.use(cors(corsOptions));
app.use('/ipnRecv', function(request,response,next){
	var isSuccess = request.param('isSuccess');
	var itemName = request.param('item_name');
	var itemNumber = request.param('item_number');
	var paymentStatus = request.param('payment_status');
	var paymentAmount = request.param('mc_gross');
	var paymentCurrency = request.param('mc_currency');
	var txnId = request.param('txn_id');
	var receiverEmail = request.param('receiver_email');
	var payerEmail = request.param('payer_email');
		
	var jsonPaymentInfo = { isSuccess : isSuccess,
							itemName : itemName,
							itemNumber : itemNumber,
							paymentStatus : paymentStatus,
							paymentAmount : paymentAmount,
							paymentCurrency : paymentCurrency,
							txnId : txnId,
							receiverEmail : receiverEmail,
							payerEmail : payerEmail							
							};
							
	DBModule.FinalizePaymentInfo(data,socket);
	
});
app.use('/reqInfo',function(request, response,next) {		
	var SnsType = request.param("snstype");
	var SnsId = request.param("snsid");
	DBModule.GetUserInfo(SnsType,SnsId,request,response);
});
app.use('/saveInfo',function(request, response,next) {	
	var jsonProfileInfo = {id : request.param("id"),
						name : request.param("name"),
						nickname : request.param("nickname"),
						age : request.param("age"),
						height : request.param("height"),
						region : request.param("region"),
						religion : request.param("religion"),
						bloodgroups : request.param("bloodgroups")
						};
	var jsonLoginInfo = {id : request.param("id"),
						snstype : request.param("snstype"),
						snsid : request.param("snsid")				
						};
	DBModule.AddUserAsync(jsonProfileInfo,jsonLoginInfo,request,response);
});

app.use('/upload',function(request, response,next) {	
	response.setHeader('Access-Control-Allow-Origin', '*');
	if(request.files.file){
		fs.readFile(request.files.file.path, function(error,data){
			var userId = request.param('id');
			var idx = request.param('imageidx');
		
			var dirPath = __dirname+"/profile_image/"+userId+"/";
			var filePath = __dirname+"/profile_image/"+userId+"/"+idx;		
			mkdir(dirPath);		
			fs.writeFile(filePath, data,function(error){
				if(error){
					throw error;
				}
				else {				
					//var responString = "http://"+TMC.CONTENTS_SERVER_ADDR+":"+TMC.CONTENTS_SERVER_FILE_ACCESS_PORT+"/"+userId+"/"+contentsFolder+"/"+request.files.file.originalFilename;
					response.send("");
					;
				}			
			});
			
		});
	}
	else{
		response.send();
	}
});

/*app.use(function(req, res, next) {
	res.header("Access-Control-Allow-Origin", "*"); 
	res.header("Access-Control-Allow-withCredentials",false);
	res.header("Access-Control-Allow-Headers", "X-Requested-With");
	res.header("Access-Control-Allow-Headers", "Content-Type");
	res.header("Access-Control-Allow-Methods", "PUT, GET, POST, DELETE, OPTIONS");
	next();
});*/

server.listen(53333,function() {
	console.log('SYI Server is Running at http://127.0.0.1:53333');
});


var fileAccessApp = express();

fileAccessApp.use(express.bodyParser());
fileAccessApp.use(cors(corsOptions));
fileAccessApp.use(express.static(__dirname + "/profile_image"));

fileAccessApp.listen(53334);


function runPageRessAndReply(url, resolution,responseObj){			
	var pageres = new Pageres({delay:2})
					.src(url,[resolution],{crop:false})
					.dest(__dirname+"/"+webPreviewRootFolder);	
	pageres.run(function(err,items){
		if(err){
			fs.readFile(__dirname+"/"+webPreviewRootFolder+"/"+noImageFileName,function(err,data){
				responseObj.writeHead(200, {'Content-Type' : 'image/png'});
				responseObj.end(data);
			});
			console.log("Error while loading Web Preview Image");
			return;	
		}		
		fs.readFile(__dirname+"/"+webPreviewRootFolder+"/"+items[0].filename,function(err,data){
			responseObj.writeHead(200, {'Content-Type' : 'image/png'});
			responseObj.end(data);
			fs.unlink(__dirname+"/"+webPreviewRootFolder+"/"+items[0].filename,function(err){
				if(err)
					throw err;
				console.log("removed temp file");
			});
		});
	});
};

/*app.use('/upload',function(request, response,next) {	
	response.setHeader('Access-Control-Allow-Origin', '*');
	if(request.files.file){
		fs.readFile(request.files.file.path, function(error,data){
			var userId = request.param(CC.REQ_PARAM_ENUM.UI);
			var contentsType  = request.param(CC.REQ_PARAM_ENUM.CT);
			var contentsFolder = "im";
			switch(contentsType){
			case CC.CONTENTS_TYPE_ENUM.Image:
				contentsFolder = "im";
				break;
			case CC.CONTENTS_TYPE_ENUM.Movie:
				contentsFolder = "mv";
				break;
			case CC.CONTENTS_TYPE_ENUM.Sound:
				contentsFolder = "snd";
				break;
			}
			console.log(request.files.file.originalFilename);
			var dirPath = __dirname+"/"+contentsRootFolder+"/"+userId+"/"+contentsFolder;
			var filePath = __dirname+"/"+contentsRootFolder+"/"+userId+"/"+contentsFolder+"/"+request.files.file.originalFilename;		
			mkdir(dirPath);		
			fs.writeFile(filePath, data,function(error){
				if(error){
					throw error;
				}
				else {				
					var responString = "http://"+TMC.CONTENTS_SERVER_ADDR+":"+TMC.CONTENTS_SERVER_FILE_ACCESS_PORT+"/"+userId+"/"+contentsFolder+"/"+request.files.file.originalFilename;
					response.send(responString);
				}			
			});
			
		});
	}
	else{
		response.send();
	}
});
app.use('/list',function(request, response,next) {		
	var userId = request.body.UI;
	var contentsType  = request.body.CT;
	
	var contentsFolder = "im";
	switch(contentsType){
	case CC.CONTENTS_TYPE_ENUM.Image:
		contentsFolder = "im";
		break;
	case CC.CONTENTS_TYPE_ENUM.Movie:
		contentsFolder = "mv";
		break;
	case CC.CONTENTS_TYPE_ENUM.Sound:
		contentsFolder = "snd";
		break;
	case CC.CONTENTS_TYPE_ENUM.WebPreview:
		//return;
		break;
	}		
	var dirPath = __dirname+"/"+contentsRootFolder+"/"+userId+"/"+contentsFolder+"/";	
	try{
		var fileList = getListOfFiles(dirPath);		
	}catch (e){
		fileList = [];
	}
	finally {
		response.setHeader('Access-Control-Allow-Origin', '*');
		var resObj = {FL : fileList,
						UF : userId,
						CF : contentsFolder,
						CT : contentsType
						};
		response.send(JSON.stringify(resObj));
	}
});*/


/*
var fileAccessApp = express();







fileAccessApp.use(express.bodyParser());
fileAccessApp.all("/*",function(request,response,next){
	response.setHeader('Access-Control-Allow-Origin', 'http://'+TMC.THINK_MINE_WEB_SERVER_ADDR);	
	response.setHeader('Access-Control-Allow-Headers',  "range,if-modified-since");
	response.setHeader('Access-Control-Expose-Headers', "Accept-Ranges,Content-Encoding,Content-Length,Content-Range");	
	//console.log(request.headers.referer);	
	if(request.headers.referer == undefined || request.headers.referer == null)
		return;
	if(request.headers.referer.toString().indexOf("ContentsFrame.html") == -1)
		return;
	//return;
	next();
});
fileAccessApp.use(express.static(__dirname + "/"+contentsRootFolder));*/
//

/*,function(request,response){
/*,function(request,response){
	response.sned("fuckyou");
	console.log('aeasdf');
}*/



/*
fileAccessApp.listen(TMC.CONTENTS_SERVER_FILE_ACCESS_PORT);


function runPageRessAndReply(url, resolution,responseObj){			
	var pageres = new Pageres({delay:2})
					.src(url,[resolution],{crop:false})
					.dest(__dirname+"/"+webPreviewRootFolder);	
	pageres.run(function(err,items){
		if(err){
			fs.readFile(__dirname+"/"+webPreviewRootFolder+"/"+noImageFileName,function(err,data){
				responseObj.writeHead(200, {'Content-Type' : 'image/png'});
				responseObj.end(data);
			});
			console.log("Error while loading Web Preview Image");
			return;	
		}		
		fs.readFile(__dirname+"/"+webPreviewRootFolder+"/"+items[0].filename,function(err,data){
			responseObj.writeHead(200, {'Content-Type' : 'image/png'});
			responseObj.end(data);
			fs.unlink(__dirname+"/"+webPreviewRootFolder+"/"+items[0].filename,function(err){
				if(err)
					throw err;
				console.log("removed temp file");
			});
		});
	});
};*/




fs.mkdirParent = function(dirPath, mode, callback) {
  //Call the standard fs.mkdir
  fs.mkdir(dirPath, mode, function(error) {
    //When it fail in this way, do the custom steps
    if (error && error.errno === 34) {
      //Create all the parents recursively
      fs.mkdirParent(path.dirname(dirPath), mode, callback);
      //And then the directory
      fs.mkdirParent(dirPath, mode, callback);
    }
    //Manually run the callback since we used our own callback to do all these
    callback && callback(error);
  });
};


function getListOfFiles(dir){
	var files = fs.readdirSync(dir)
				  .map(function(v) { 
					  return { name:v,
							   time:fs.statSync(dir + v).mtime.getTime()
							 }; 
				   })
				   .sort(function(a, b) { return a.time - b.time; })
				   .map(function(v) { return v.name; });			  
	return files;
}
			  

function mkdir(path, root) {

    var dirs = path.split('/'), dir = dirs.shift(), root = (root || '') + dir + '/';

    try { fs.mkdirSync(root); }
    catch (e) {
        //dir wasn't made, something went wrong
        if(!fs.statSync(root).isDirectory()) throw new Error(e);
    }

    return !dirs.length || mkdir(dirs.join('/'), root);
}

