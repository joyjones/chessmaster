var env = {
	privileges: [
        {value: 1, name: '登录'},
        {value: 2, name: '支招'},
        {value: 4, name: '升级会员'},
        {value: 8, name: '购买金币'},
        {value: 16, name: '加盟'},
        {value: 32, name: '加盟登录'},
	],
	tickets: ko.observableArray([]),
	characters: ko.observableArray([]),
	curTicket: ko.observable(null),
	evts: {
		gotoUser: function(){
			window.location.href = 'user.html';
		},
		gotoGame: function(){
			window.location.href = 'main.html';
		},
		clickTicket: function(k){
			env.curTicket(k);
			$('#dlgList').modal('show');
		},
		clickRequire: function(k){
			app.callajax('Ticket/Require', {
				player_id: data.user.id,
				ticket_id: env.curTicket().id
			}, function(s, e){
				alert(errorstr('getlist', null, s, e));
			}, function(resp){
				console.info(resp);
				if (!resp.success)
					alert(app.getPromptMessage(resp.message));
				else{
					alert('恭喜你成功获得该凭券！');
					$('#dlgList').modal('hide');
				}
				env.evts.requireList();
			});
		},
		requireList: function(){
			app.callajax('Ticket/GetList', {
				player_id: data.user.id
			}, function(s, e){
				alert(errorstr('getlist', null, s, e));
			}, function(resp){
				console.info(resp);
				env.tickets($.parseJSON(resp.tickets));
				env.characters($.parseJSON(resp.characters));
			});
		},
		getPrivilege: function(charId){
			var cs = env.characters();
			for (var i = 0; i < cs.length; i++) {
				if (cs[i].id == charId){
					return cs[i].privileges;
				}
			};
		},
		getTerms: function(){
			var words = ['','','',''];
			var fmts = [
				'领取本凭券后您即可拥有%s等授权',
				'本券使用期限截止至:%s',
				'在您连续%s内未访问本应用主页时，本券将被系统收回，需要时您可再次访问本页面查看和领取剩余凭券',
				'您最多可以持有%s张该券'
			];
			var t = env.curTicket();
			if (t.character_id < 0)
				return '';
			var privs = env.evts.getPrivilege(t.character_id);
			for (var i = 0; i < env.privileges.length; i++) {
				var p = env.privileges[i];
				if ((privs & p.value) == p.value){
					if (words[0].length > 0)
						words[0] += '、';
					words[0] += p.name;
				}
			};
			if ((Number)(t.time_expire.substr(0, 4)) < 2050){
				words[1] = t.time_expire;
			}
			if (t.time_activespan > 0){
				var rest_secs = t.time_activespan;
				var days = (rest_secs / (3600 * 24)).toFixed(0);
				rest_secs -= days * (3600 * 24);
				var hours = (rest_secs / 3600).toFixed(0);
				rest_secs -= hours * 3600;
				var mins = (rest_secs / 60).toFixed(0);
				rest_secs -= mins * 60;
				var secs = rest_secs % 60;
				if (days > 0)
					words[2] += days + '天';
				if (hours > 0)
					words[2] += hours + '小时';
				if (mins > 0)
					words[2] += mins + '分';
				if (secs > 0)
					words[2] += secs + '秒';
			}
			if (t.max_holding_count > 0){
				words[3] = t.max_holding_count + '';
			}
			var terms = '<p>', idx = 1;
			for (var i = 0; i < words.length; i++) {
				if (words[i].length == 0)
					continue;
				terms += idx + '、';
				terms += sprintf(fmts[i], '<span class="red">' + words[i] + '</span>');
				terms += '<br>';
				++idx;
			};
			terms += '</p>';
			return terms;
		}
	}
};

$(function(){
	app.login(function(){
		env.tickets.push({
			name: '当前还没有可用的凭券哦。',
			description: '',
			logo: null,
			character_id: -1,
			distributed_count: 0,
			using_count: 0
		});
		env.curTicket(env.tickets()[0]);

		ko.applyBindings(env);

		env.evts.requireList();
	});
});