var env = {
	info: ko.observableArray([]),
	tickets: ko.observableArray([]),
	curTicket: ko.observable({ticket:{},instance:{}}),
	evts: {
		gotoTicket: function(){
			window.location.href = 'ticket.html';
		},
		gotoGame: function(){
			window.location.href = 'main.html';
		},
		clickItem: function(k){
			if (k.ex.tobj){
				env.curTicket(k.ex.tobj);
				$('#dlgList').modal('show');
			}
		},
		discardTicket: function(k){
			var t = env.curTicket();
			if (t == null) return;
			app.callajax('Ticket/Discard', {
				player_id: data.user.id,
				instance_id: t.instance.id
			}, function(s, e){
				alert(errorstr('getlist', null, s, e));
			}, function(resp){
				if (!resp.success)
					alert(app.getPromptMessage(resp.message));
				else{
					alert('丢弃成功！');
					window.location.reload();
				}
			});
		}
	}
};

$(function(){
	app.login(function(){
		var infos = [];
		infos.push({title: '头像', value: '', img: data.user.headimgurl, ex: {}});
		infos.push({title: '昵称', value: data.user.nickname, img: null, ex: {}});
		infos.push({title: '邮箱', value: data.user.email, img: null, ex: {}});
		infos.push({title: '手机号码', value: data.user.cellphone, img: null, ex: {}});
		infos.push({title: '金币', value: data.user.golds, img: null, ex: {}});
		infos.push({title: '存档数', value: data.user.slot_count, img: null, ex: {}});
		var vip = data.db.vips[data.user.vip_level];
		infos.push({title: '会员等级', value: vip.name, img: 'assets/images/vip'+data.user.vip_level+'.png', ex: {}});
		var endtime = data.user.vip_endtime;
		endtime = endtime.indexOf('T') > 0 ? endtime.substr(0, endtime.indexOf('T')) : endtime;
		infos.push({title: '会员截止日', value: endtime, img: null, ex: {}});
		env.info(infos);

		var ts = [];
		for (var i = 0; i < data.tickets.length; i++) {
			var t = data.tickets[i];
			ts.push({
				title: t.ticket.name, 
				value: ko.observable(''), 
				img: 'assets/images/'+t.ticket.logo, 
				ex: {
					tobj: t, 
					time1: t.resttime, 
					time2: t.restspan
				}
			});
		};
		if (ts.length == 0){
			ts.push({
				title: '',
				value: '暂无凭券，请在凭券中心领取。',
				img: null,
				ex: {empty: true}
			});
		}
		env.tickets(ts);

		ko.applyBindings(env);

		setInterval(function(){
			var ts = env.tickets();
			for (var i = 0; i < ts.length; i++) {
				var t = ts[i];
				if (t.ex.empty)
					continue;
				t.ex.time1 -= 1;
				t.ex.time2 -= 1;
				var text = '';
				if (t.ex.time1 <= 0)
					text = '已过期';
				else if (t.ex.time1 < 10 * 365 * 24 * 3600)
					text = '剩余' + timestr(t.ex.time1);
				if (t.ex.time2 > 0){
					text.length > 0 && (text += '<br>');
					text += timestr(t.ex.time2) + '内不登录自动失效';
				}
				t.value(text);
			};
		}, 1000);
	});
});