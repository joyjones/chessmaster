var g_opened = false;

var join = (function(){
	return {
		init: function(){
			$('section:eq(0)').removeClass('visible');
			$('section:eq(1)').addClass('visible');
			$('#join').on('vclick', function(e){
				e.preventDefault();
				join.doJoin();
			});
		},
		verify: function(){
			var email = $('#email').val();
			var psw1 = $('#password1').val();
			var psw2 = $('#password2').val();
			var name = $('#realname').val();
			var phone = $('#cellphone').val();
			var idcard = $('#idcard').val();
			if (!email || email.length == 0){
				alert('请填写您的登录邮箱。');
				return false;
			}
			if (!psw1 || psw1.length < 6){
				alert('请填写您的登录密码（至少六位）。');
				return false;
			}
			if (!psw2 || psw2.length < 6){
				alert('请填写您的确认密码（至少六位）。');
				return false;
			}
			if (!name || name.length == 0){
				alert('请填写您的真实姓名。');
				return false;
			}
			if (!phone || phone.length == 0){
				alert('请填写您的手机号码。');
				return false;
			}
			if (!idcard || idcard.length == 0){
				alert('请填写您的身份证号码。');
				return false;
			}
			if (!/\S+@\S+\.\S+/.test(email)){
				alert('您的登录邮箱地址格式不正确。');
				return false;
			}
			if (psw1 != psw2){
				alert('您两次填写的登录密码不一致。');
				return false;
			}
			if (phone.length != 11){
				alert('请填写正确的11位手机号码。');
				return false;
			}
			if (idcard.length != 18 && idcard.length != 15){
				alert('您填写的身份证号码格式不正确。');
				return false;
			}
			return true;
		},
		doJoin: function(){
			if (configs.data.user == null)
				return;
			if (!g_opened){
				alert('功能暂未开放。');
				return;
			}
			if (!this.verify())
				return;
			var email = $('#email').val();
			var psw = $('#password1').val();
			var name = $('#realname').val();
			var phone = $('#cellphone').val();
			var idcard = $('#idcard').val();
			app.callajax('Partner/Join', {
				player_id: configs.data.user.id,
				account: email,
				password: psw,
				realname: name,
				cellphone: phone,
				idcard_no: idcard
			}, function(e1, e2){
				alert(e1, e2);
			}, function(resp){
				if (resp.success)
					join.onJoinSucceeded();
				else
					alert(app.getPromptMessage(resp.message));
			});
		},
		onJoinSucceeded: function(){
			$('section:eq(1)').removeClass('visible');
			$('section:eq(2)').addClass('visible');
		},
		onEverJoined: function(data){
			console.log(data);
			$('section:eq(0)').removeClass('visible');
			$('section:eq(3)').addClass('visible');
		}
	}
})();

$(function(){
	app.login(function(){
		app.callajax('Partner/Get', {
			player_id: data.user.id,
		}, function(e1, e2){
			alert(e1, e2);
		}, function(resp){
			if (resp.success)
				join.onEverJoined(resp.data);
			else
				join.init();
		});
	});
});