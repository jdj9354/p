var mysql = require('mysql');
var request = require('request');

var totalCount = 0;

var connection = mysql.createConnection({
    host    :'localhost',
    port : 3306,
    user : 'root',
    password : '1234qwer',
    database:'syi'
});

connection.connect(function(err) {
    if (err) {
        console.error('mysql connection error');
        console.error(err);
        throw err;
    }
	var query = connection.query('select COUNT(*) as totalCount from profile',function(err,rows){
		totalCount = rows[0].totalCount;
		console.log("MySQL Module - total user count : " + totalCount);
	});
});

exports.AddUserAsync = function (jsonProfileInfo,jsonLoginInfo,socket){

    var query = connection.query('insert into profile set ?',jsonProfileInfo,function(err,result){
        if (err) {
            console.error(err);
			jsonProfileInfo.success = false;
			socket.emit('res',jsonProfileInfo);
            throw err;
        }
		var secondQuery = connection.query('insert into logininfo set ?',jsonLoginInfo,function(err,result){
			if (err) {
				connection.query('delete from profile where uuid='+jsonProfileInfo.uuid,function(err,result){
					;
				});
				console.error(err);
				jsonProfileInfo.success = false;
				socket.emit('res',jsonProfileInfo);
				throw err;
			}
			var thirdQuery = connection.query('insert into cost values ("'+jsonProfileInfo.uuid+'",50)',function(err,result){
				console.log('insert into cost values ("'+jsonProfileInfo.uuid+'",50)');
				if(err){
					connection.query('delete from profile where uuid='+jsonProfileInfo.uuid,function(err,result){
						;
					});
					connection.query('delete from logininfo where uuid='+jsonProfileInfo.uuid,function(err,result){
						;
					});
				}
				jsonProfileInfo.success = true;
				totalCount++;
				
				socket.emit('res',jsonProfileInfo);
			});
		});
        
    });	
};

exports.ChangeUserInfoAsync = function (jsonProfileInfo,jsonLoginInfo,socket){
	var query = connection.query('select uuid from logininfo where snstype="'+jsonLoginInfo.snstype+'" and snsid="'+jsonLoginInfo.snsid+'"',function(err,rows){
		if(rows.length == 0){
			jsonProfileInfo.success = false;
			socket.emit('res',jsonProfileInfo);
			return;
		}
		var uuid = rows[0].uuid;
		jsonProfileInfo.uuid = uuid;
		var secondQuery = connection.query('update profile set ? where uuid =?',[jsonProfileInfo,uuid],function(err,result){
			if (err) {
				console.error(err);
				jsonProfileInfo.success = false;
				socket.emit('res',jsonProfileInfo);
				throw err;
			}
			jsonProfileInfo.success = true;			
			socket.emit('res',jsonProfileInfo);     
		});	 
    });  
    
};

exports.GetUserInfo = function (SnsType,SnsId,socket){
	var ret={};
	var query = connection.query('select uuid from logininfo where snstype="'+SnsType+'" and snsid="'+SnsId+'"',function(err,rows){
		if(rows.length == 0){
			ret = {isEmpty : true};
			socket.emit('res',ret);
			return;
		}
		var uuid = rows[0].uuid;
		var secondQuery = connection.query('select * from profile where uuid="'+uuid+'"' ,function(err,rows){		
			ret.profile = rows[0];
			var thirdQuery = connection.query('select value from cost where uuid="'+uuid+'"' ,function(err,rows){		
				ret.costVal = rows[0].value;
				socket.emit('res',ret);
			});  			
		});     
    });   
};

exports.GetUserInfoByUUID = function (uuid,socket){
	var query = connection.query('select * from profile where uuid="'+uuid+'"' ,function(err,rows){			
		socket.emit('res',rows[0]);
	});     

};

exports.RenewLoginInfo = function(uuid,timestamp,socket){
	var query = connection.query('select * from logininfo where uuid="'+uuid+'"' ,function(err,rows){			
		if(err){
			return;			
		}		
		console.log(rows);
		var prevTimeStamp = rows[0].lastlogin;
		
		var minutes = 1000 * 60;
		var hours = minutes * 60;
		var days = hours * 24;
		var years = days * 365;
		
		var prevDay = Math.round(prevTimeStamp / days);
		var curDay = Math.round(timestamp / days);
		
		console.log("prevDay : " + prevDay);
		console.log("curDay : " + curDay);

		var secondQuery = connection.query('update logininfo set lastlogin =' + timestamp + ' where uuid="'+uuid+'"',function(err,rows){
			var result = {};
			if((curDay - prevDay) > 0){			
				var thirdQuery = connection.query('update cost set value = value+50 where uuid="'+uuid+'"' ,function(err,rows){
					if(err){
						return;
					}
					socket.emit('renewLoginResult',result);
				});
			}
			else
				socket.emit('renewLoginResult',result);
		});					
	});  	
};

exports.searchRandomUser = function(SnsType,SnsId,socket){
	var query = connection.query('select uuid from logininfo where snstype="'+SnsType+'" and snsid="'+SnsId+'"',function(err,rows){
		if(rows.length == 0){
			socket.emit('res',{isEmpty : true});
			return;
		}
		var uuid = rows[0].uuid;		
		var secondQuery = connection.query('select id,sex from profile where uuid="'+uuid+'"' ,function(err,rows){			
			var randomId = Math.floor((Math.random() * totalCount) + 1);
			var curUserId = rows[0].id;
			var curUserSex = rows[0].sex;
			
			while(randomId == curUserId){
				randomId = Math.floor((Math.random() * totalCount) + 1);
			}
			//cost 값 확인하여 서버단에서 체크 필요
			var thirdQueryCallBack = function(err,rows){
				if(rows[0].sex != curUserSex){
					var socektReplyInfo = rows[0];					
					var fourthQuery = connection.query('update cost set value = value-1 where uuid="'+uuid+'" and value > 0' , function(err,rows){
						if(rows.changedRows == 0){
							socket.emit('res',{isEmpty : true, reason : "c0"});
						}
						else{
							socket.emit('res',socektReplyInfo);	
						}
					});   			
				}
				else{
					while(randomId == curUserId){
						randomId = Math.floor((Math.random() * totalCount) + 1);
					}
					connection.query('select * from profile where id='+randomId+'' , thirdQueryCallBack);   				
				}
			};
			
			var thirdQuery = connection.query('select * from profile where id='+randomId+'' , thirdQueryCallBack); 
		});     
    });   
};

exports.AddMatchingInfoAsync = function (matchingInfo,socket){

    var query = connection.query('insert into matchinginfo set ?',matchingInfo,function(err,result){
        if (err) {
            console.error(err);
			matchingInfo.success = false;
			socket.emit('res',matchingInfo);
            throw err;
        }
		
		matchingInfo.success = true;			
		socket.emit('res',matchingInfo);        
    });	
};

exports.ToggleMatchingInfoAsync = function (matchingInfo,socket){	
    var query = connection.query('update matchinginfo set pending = 0 where suuid = "'+ matchingInfo.suuid + '" and ruuid = "' + matchingInfo.ruuid+'";',	function(err,result){
        if (err) {
            console.error(err);
			matchingInfo.success = false;
			socket.emit('res',matchingInfo);
            throw err;
        }
		console.log(matchingInfo);
		matchingInfo.success = true;			
		socket.emit('res',matchingInfo);        
    });	
};

exports.GetAllMatchingInfoAsync = function(ruuid,socket){
	
	var resultInfo = {	isSuccess : true,
					data : []};
	
	var query = connection.query('select * from matchinginfo where ruuid = "' + ruuid + '" and pending = 1;',function(err,result){
		
        if (err) {
            console.error(err);		
			resultInfo.isSuccess = false;
			socket.emit('matchingInfoData',resultInfo);
            throw err;
			return;
        }
		
		if(result.length == 0){
			socket.emit('matchingInfoData',resultInfo);  
			return;
		}
		
		var count = 0;

		var loopFunction = function(loopCount,iterateArray,resultInfo){
			
			var innerQuery = connection.query('select * from profile where uuid = "'+iterateArray[loopCount].suuid+'"', function(err,result){
				if(err){
					console.error(err);			
					resultInfo.isSuccess = false;
					resultInfo.data = [];
					socket.emit('matchingInfoData',resultInfo);
					throw err;
					return;					
				}
				
				resultInfo.data.push({matchingInfo : iterateArray[loopCount],
										sprofile : result[loopCount]});
										console.log(resultInfo.data);
										
				loopCount++;
				if(loopCount == iterateArray.length){
					socket.emit('matchingInfoData',resultInfo);   
					return;
				}
				else{
					loopFunction(loopCount,iterateArray,resultInfo);
				}
			});			
		};
		loopFunction(count,result,resultInfo);
    });	
};

exports.GetAllMatchedInfoAsync = function(uuid,socket){
	
	var resultInfo = {	isSuccess : true,
					data : []};	
	var query = connection.query('select * from matchinginfo where (ruuid = "' + uuid +'" or suuid = "'+uuid+'") and pending = 0;',function(err,result){
			
        if (err) {
            console.error(err);		
			resultInfo.isSuccess = false;
			socket.emit('matchedInfoData',resultInfo);
            throw err;
			return;
        }
		
		if(result.length == 0){			
			socket.emit('matchedInfoData',resultInfo);  
			return;
		}
		
		var count = 0;

		var loopFunction = function(loopCount,iterateArray,resultInfo){
			var searchingUUID = iterateArray[loopCount].suuid == uuid ? iterateArray[loopCount].suuid : iterateArray[loopCount].ruuid;
			var innerQuery = connection.query('select * from profile where uuid = "'+searchingUUID+'"', function(err,result){
				if(err){
					console.error(err);			
					resultInfo.isSuccess = false;
					resultInfo.data = [];
					socket.emit('matchedInfoData',resultInfo);
					throw err;
					return;					
				}
				
				resultInfo.data.push({matchingInfo : iterateArray[loopCount],
										sprofile : result[loopCount]});
										console.log(resultInfo.data);
										
				loopCount++;
				if(loopCount == iterateArray.length){
					socket.emit('matchedInfoData',resultInfo);   
					return;
				}
				else{
					loopFunction(loopCount,iterateArray,resultInfo);
				}
			});			
		};
		loopFunction(count,result,resultInfo);
    });	
};

exports.GetAllArrivedOkInfoAsync = function(ruuid,socket){
	var resultInfo = {	isSuccess : true,
				data : []};	
	
	var query = connection.query('select * from matchinginfo where ruuid = "' + ruuid + '";',function(err,result){
		
        if (err) {
            console.error(err);		
			resultInfo.isSuccess = false;
			socket.emit('arrivedOkInfoData',resultInfo);
            throw err;
			return;
        }
		
		if(result.length == 0){
			socket.emit('arrivedOkInfoData',resultInfo);  
			return;
		}
		
		var count = 0;

		var loopFunction = function(loopCount,iterateArray,resultInfo){
			
			var innerQuery = connection.query('select * from profile where uuid = "'+iterateArray[loopCount].ruuid+'"', function(err,result){
				if(err){
					console.error(err);			
					resultInfo.isSuccess = false;
					resultInfo.data = [];
					socket.emit('arrivedOkInfoData',resultInfo);
					throw err;
					return;					
				}
				
				resultInfo.data.push({matchingInfo : iterateArray[loopCount],
										sprofile : result[loopCount]});
										console.log(resultInfo.data);
										
				loopCount++;
				if(loopCount == iterateArray.length){
					socket.emit('arrivedOkInfoData',resultInfo);   
					return;
				}
				else{
					loopFunction(loopCount,iterateArray,resultInfo);
				}
			});			
		};
		loopFunction(count,result,resultInfo);
	});
};

exports.GetAllSentInfoAsync = function(suuid,socket){
	var resultInfo = {	isSuccess : true,
				data : []};	
	
	var query = connection.query('select * from matchinginfo where suuid = "' + suuid + '";',function(err,result){
		
        if (err) {
            console.error(err);		
			resultInfo.isSuccess = false;
			socket.emit('matchingSendInfoData',resultInfo);
            throw err;
			return;
        }
		
		if(result.length == 0){
			socket.emit('matchingSendInfoData',resultInfo);  
			return;
		}
		
		var count = 0;

		var loopFunction = function(loopCount,iterateArray,resultInfo){
			
			var innerQuery = connection.query('select * from profile where uuid = "'+iterateArray[loopCount].suuid+'"', function(err,result){
				if(err){
					console.error(err);			
					resultInfo.isSuccess = false;
					resultInfo.data = [];
					socket.emit('matchingSendInfoData',resultInfo);
					throw err;
					return;					
				}
				
				resultInfo.data.push({matchingInfo : iterateArray[loopCount],
										sprofile : result[loopCount]});
										console.log(resultInfo.data);
										
				loopCount++;
				if(loopCount == iterateArray.length){
					socket.emit('matchingSendInfoData',resultInfo);   
					return;
				}
				else{
					loopFunction(loopCount,iterateArray,resultInfo);
				}
			});			
		};
		loopFunction(count,result,resultInfo);
	});
};

exports.InitPaymentInfo = function(data,socket){

	var resultInfo = {};			
	var query = connection.query('select * from logininfo where (snstype = "' + data.login_type +'" and snsid = "'+data.login_id+'");',function(err,result){			
        if (err) {			
            console.error(err);		
			resultInfo.isSuccess = false;
			socket.emit('res',resultInfo);
            throw err;
			return;
        }
		var payer_uuid = result[0].uuid;
		
		var newPaymentInfo = {puuid : data.puuid,
								payer_uuid : payer_uuid,
								item_name : "N/A",
								item_number : 0,
								payment_status : "pending",
								payment_amount : 0,
								payment_currency : "N/A",
								txn_id : "N/A",
								receiver_email : "N/A",
								payer_email : "N/A"};
								
		var secondQuery = connection.query('insert into payment set ?',newPaymentInfo,function(err,result){			
			if (err) {				
				console.error(err);		
				resultInfo.isSuccess = false;
				socket.emit('res',resultInfo);
				throw err;
				return;
			}
			resultInfo.isSuccess = true;
			resultInfo.puuid = data.puuid;
			
			socket.emit('res',resultInfo);			
			return;
		});
	});
};


exports.FinalizePaymentInfo = function(data){

	var query = connection.query('update payment set'+' item_name =' + '"'+data.itemName +'"'
													+', item_number =' + data.itemNumber
													+', payment_status =' + '"'+data.paymentStatus +'"'
													+', payment_amount =' + data.paymentAmount
													+', payment_currency =' + '"'+data.paymentCurrency +'"'
													+', txn_id =' + '"'+data.txnId +'"'
													+', receiver_email =' + '"'+data.receiverEmail +'"'
													+', payer_email =' + '"'+data.payerEmail +'"'
													+', number_dice =' + data.numberOfDice
													+ ' where puuid="'+data.puuid+'"',function(err,rows){
		if (err) {				
			console.error(err);	
			throw err;
			return;
		}		
		return;
	});			
};


exports.ResponsePaymentInfo = function(data,socket){
	var resultInfo = {	isSuccess : true,
					data : []};	
	var query = connection.query('select * from payment where payer_uuid="'+data.payer_uuid+'"',function(err,rows){
		if (err) {				
			resultInfo.isSuccess = false;
			console.error(err);	
			socket.emit('res',resultInfo);
			throw err;
			return;
		}
		for(var i=0; i<rows.length; i++){
			resultInfo.data.push({puuid : rows[i].puuid,
									payer_uuid : rows[i].payer_uuid,
									cost : rows[i].payment_amount,
									currency : rows[i].payment_currency,
									nd : rows[i].number_dice,
									tnxid : rows[i].txn_id
									});			
		}
		socket.emit('res',resultInfo);		
		return;
	});			
};


exports.RefundRequestHandle = function(data,socket){
	var resultInfo = {	isSuccess : true,
				data : []};	
	var query = connection.query('update payment set'+' payment_status =' + '"PendingRefund"'													
													+ ' where puuid="'+data.puuid+'"',function(err,rows){
		if (err) {		
			resultInfo.isSuccess = false;
			resultInfo.data.push("pr");
			console.error(err);	
			socket.emit('res',resultInfo);
			throw err;
			return;
		}		
		
		var secondQuery = connection.query('update cost set'+' value =' + ' value - ' + data.nd												
												+ ' where puuid="'+data.puuid+'"',function(err,rows){
			if (err) {			
				resultInfo.isSuccess = false;
				resultInfo.data.push("cm");			
				console.error(err);	
				socket.emit('res',resultInfo);
				throw err;
				return;
			}	
			
			
			var options = {
				method: 'GET',
				body: {}, // Javascript object
				json: true, // Use,If you are sending JSON data
				url: "https://api.sandbox.paypal.com/v1/payments/refund/"+data.tnxid,
				headers: { "Content-Type":"application/json",
							"Authorization": "Bearer A101.pTWSXUfiVttLeCer6Z8YF-5GdzgYwYTF6bH4pPLDFCqUzzePb78q3-375BiwtQ9U.i1bDerD8Q953EYxCkA1szpUTy-G"
				// Specify headers, If any
				}
			}

			request(options, function (err, res, body) {
			  if (err) {
				console.log('Error :', err)
				return
			  }
			  console.log(' Body :', body)

			});
			
			
			return;
		});	
				
		
		return;
	});	
}