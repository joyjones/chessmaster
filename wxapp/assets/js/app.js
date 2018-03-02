var debugmode = false;
var localserver = false;
var use_localdata = false;
var upgrading = false;
var configs = {
	appid: 'wxd0896b8367d3917d', //象棋支招大师
	serverUrl: localserver ? "http://localhost:6305/" : "http://103.43.187.148/",
	shareInfo: {
		title: '象棋支招大师',
		desc: '『象棋支招大师』是一款着眼于利用先进的互联网技术和终端计算机强大的计算能力，为您提供中国象棋指定棋局最佳出招方案的移动端轻应用。',
		link: window.location.href,
		imgUrl: getLocalUrl() + 'assets/images/logo.jpg',
		type: 'link',
		success: function () {
		},
		cancel: function () {
		}
	},
	bbsUrl: 'http://wsq.qq.com/reflow/263887120',
	helpUrl: 'http://mp.weixin.qq.com/s?__biz=MzAwMzEzNDA5MA==&mid=202233757&idx=1&sn=f370398e3a6e55818fc179f50ec14ee9#rd',
};
var data = null;

var prompts_mapping = [
	{ code: 0, msg: '' },
    { code: 1, msg: '无效的参数-_-b' },
    { code: 2, msg: '未能找到指定用户-_-b' },
    { code: 3, msg: '服务器未启动请稍后再试哦~' },
    { code: 4, msg: '数据库处理失败-_-b' },
    { code: 5, msg: '账号已被使用。' },
    { code: 6, msg: '金币不足啦~' },
    { code: 7, msg: '未能找到指定存档-_-b' },
    { code: 8, msg: '没有找到可为您服务的引擎终端，或正在维护中，您可以稍后再试哦~' },
    { code: 9, msg: '没有找到使用您要求引擎的终端，您可以改换其他引擎再试~' },
    { code: 10, msg: '您已经是加盟成员啦。' },
    { code: 11, msg: '您已经注册过啦。' },
    { code: 12, msg: '不支持您选择的计算深度哦~' },
    { code: 13, msg: '您暂时还没有登录权限哦~赶紧去公众号菜单“凭券中心”中领取一张测试凭券吧！' },
    { code: 14, msg: '您还没有支招权限哦~赶紧去公众号菜单“凭券中心”中领取一张测试凭券吧！' },
    { code: 15, msg: '由于异常情况服务器已将您移除-_-b' },
    { code: 16, msg: '未能找到指定的付费记录-_-b' },
    { code: 17, msg: '您暂时还没有交易权限哦~赶紧去公众号菜单“凭券中心”中领取一张交易凭券吧！' },
    { code: 18, msg: '您暂时还没有加盟权限哦~赶紧去公众号菜单“凭券中心”中领取一张加盟凭券吧！' },
    { code: 19, msg: '未能找到指定的凭券-_-b' },
    { code: 20, msg: '该凭券已经过期啦。' },
    { code: 21, msg: '晚了一步，该凭券已无库存啦！' },
    { code: 22, msg: '你持有的本凭券已经达到最大数量。' },
    { code: 23, msg: '该凭券效用过低，不合适你哦~' },
];


var app = (function(){
	var gameMode = false;
	var ajaxlocked = false;
	return {
		login: function(callbk, gamemode){
			gameMode = gamemode;
			if (debugmode){
				if (!use_localdata)
					this.getUserInfo(1, callbk);
				else {
					var localdata = localData.get('chessmaster_saved_data');
					if (localdata){
						data = $.parseJSON(localdata);
						this.init();
						callbk && callbk();
					}
				}
				return;
			}
			$.ajax({
				url: getLocalUrl() + 'authorize.php?require=1',
				type: 'get',
				error: function(r, s, e){
					alert(errorstr('auth-require', r, s, e));
                    app.authorize();
				},
				success: function(uid){
					uid = Number(uid);
					if (!uid)
                    	app.authorize();
                    else
						app.getUserInfo(uid, callbk);
				}
			});
		},
		getUserInfo: function(uid, callbk){
			this.callajax('Player/Login', {
				player_id: uid,
				game: gameMode,
				useragent: navigator.userAgent
			},
			function(r, s, e){
				if (debugmode)
					alert(errorstr('login', r, s, e));
				else
					app.authorize();
			},
			function(resp){
				if (!resp.success) {
					data = data || {};
					if (resp.message == 13)
						app.quit(app.getPromptMessage(resp.message));
					else
						app.authorize();
				}
				else {
					if (gameMode){
						data = {
							user: $.parseJSON(resp.userinfo),
							db: $.parseJSON(resp.data),
							presents: $.parseJSON(resp.presents),
							engines: $.parseJSON(resp.engines),
							slots: $.parseJSON(resp.slots),
							tickets: $.parseJSON(resp.tickets),
						};
						if (use_localdata){
							var json = JSON.stringify(data);
							localData.set('chessmaster_saved_data', json);
						}
						for (var i = 0; i < data.db.vips.length; i++) {
							if (!data.db.vips[i].opening)
								data.db.vips.splice(i--, 1);
						};
					}else{
						data = {
							user: $.parseJSON(resp.userinfo),
							db: $.parseJSON(resp.data),
							tickets: $.parseJSON(resp.tickets),
						};
					}
					for (var i = 0; i < data.tickets.length; i++) {
						var t = data.tickets[i];
						t.ticket = $.parseJSON(t.ticket);
						t.instance = $.parseJSON(t.instance);
					}
					app.init();
					callbk && callbk();
				}
			});
		},
		authorize: function() {
			if (debugmode) return;
			var url = "https://open.weixin.qq.com/connect/oauth2/authorize";
			url += "?appid=" + configs.appid;
			url += "&redirect_uri=";
			var cburl = getLocalUrl() + "authorize.php";
			cburl += "?fromurl=" + getRelativeUrl(configs.foldername, true, false, true, true);
			url += encodeURIComponent(cburl);
			url += "&response_type=code&scope=snsapi_userinfo";
			url += "&state="+configs.appid;
			url += "#wechat_redirect";
			window.location.href = url;
		},
		init: function(){
			$.ajax({
	      		url: 'wxentry.php',
				dataType: 'json',
				error: function(r, s, e){
					alert(errorstr('wxinit', r, s, e));
					console.log(s, e);
				},
				success: function(resp){
					wx.config({
						debug: false,
						appId: resp.appId,
						timestamp: resp.timestamp,
						nonceStr: resp.nonceStr,
						signature: resp.signature,
						jsApiList: [
							'onMenuShareAppMessage',
							'onMenuShareTimeline',
							'chooseWXPay',
							'closeWindow'
						]
					});
					wx.ready(function () {
						app.setShareInfo();
					});
				}
			});
			wx.error(function (res) {
				alert('wxerror: ' + res.errMsg);
			});
		},
		setShareInfo: function(title, desc, url, logo) {
			title && (configs.shareInfo.title = title);
			desc && (configs.shareInfo.description = desc);
			url && (configs.shareInfo.link = url);
			logo && (configs.shareInfo.imgUrl = logo);
			wx.onMenuShareAppMessage(configs.shareInfo);
			wx.onMenuShareTimeline(configs.shareInfo);
		},
		getPromptMessage: function(errcode){
			for (var i = 0; i < prompts_mapping.length; ++i){
				if (prompts_mapping[i].code == errcode)
					return prompts_mapping[i].msg;
			}
			return errcode;
		},
		getEngine: function(id){
			for (var i = 0; i < data.db.engines.length; i++) {
				var e = data.db.engines[i];
				if (e.id == id){
					return e;
				}
			};
			return null;
		},
		callajax: function(url, datas, cb_err, cb_ok) {
			console.log('callajax:'+url);
			// if (ajaxlocked)
			// 	console.error('callajax confilicting!');
			ajaxlocked = true;
			$.ajax({
				url: configs.serverUrl + url,
				type: 'get',
				data: datas,
				dataType: 'jsonp',
				async: false,
				error: function(r, s, e){
					if (!cb_err)
						alert(errorstr(url, r, s, e));
					else
						cb_err(s, e);
				},
				success: function(resp){
					cb_ok && cb_ok(resp);
				}
			});
			ajaxlocked = false;
		},
		quit: function(msg){
			msg && alert(msg);
			if (!data || !data.user) return;
			console.log('quiting');
			this.callajax('Player/Quit', {
				player_id: data.user.id
			}, function(){
				wx.closeWindow();
			}, function(){
				wx.closeWindow();
			});
		}
	}
})();
