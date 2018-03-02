
var env = $.extend({}, configs, {
	vars: {
		inited: false,
		kdata: null,

	    curVip: ko.observable(null),
	    curCost: null,
	    curOptMode: ko.observable(0), // 0: normal, 1: placing, 2: calcing, 3: paying
	    selMenuItem: ko.observable(null),
	    selVip: ko.observable(null),
	    selVipMonth: ko.observable(null),
	    selGoldpay: ko.observable(null),
	    selSlotIndex: ko.observable(-99),
		diedPieces: ko.observableArray([]),
		curEngine: ko.observable(''),
		curEngineList: ko.observableArray([]),
		curPayAttach: '',

		timeSpans: {
			beatHeart: 4000,
			retryGo: 1000,
			requireResult: 2000,
			requirePay: 2000,
		},
		menuItems_data: [
			{id: 1, name: '', opt: '升级>', logo: '', sep: false, lstTpl: true},
			{id: 2, name: '', opt: '充值>', logo: 'gold.png', sep: true, lstTpl: true},
			{id: 3, name: '载入棋局', opt: '>', logo: 'mi_load.png', sep: false, lstTpl: true},
			{id: 4, name: '保存棋局', opt: '>', logo: 'mi_save.png', sep: true, lstTpl: true},
			{id: 5, name: '设置', opt: '>', logo: 'mi_option.png', sep: true, lstTpl: true},
			{id: 6, name: '进入社区', opt: '', logo: 'mi_social.png', sep: false},
			{id: 7, name: '帮助', opt: '', logo: 'mi_help.png', sep: false},
		],
	    getLimitStr: function(limit){
	    	if (limit < 0)
	    		return '';
	    	var txt = (limit === 0 ? '不可支招' : limit);
	    	return '最大支招深度: ' + txt;
	    },
	    getVip: function(id){
			for (var i = 0; i < data.db.vips.length; i++) {
	    		if (data.db.vips[i].id === id)
	    			return data.db.vips[i];
	    	}
	    	return null;
	    },
	    selectMenuItem: function(id){
	    	if (!env.vars.inited) return;
	    	if (id <= 0){
				env.vars.selMenuItem(null);
				return;
	    	}
	    	var mi = env.vars.menuItems()[id-1];
			env.vars.selMenuItem(mi);
			switch(mi.id) {
				case 1: {
		    		env.vars.selVip(null);
		    		env.vars.selVipMonth(null);
					setTimeout(function(){
	    				env.stat.list_deep(0);
	    			}, 100);
				} break;
				case 6: {
					main.hideList();
					if (window.confirm('点击确定跳往象棋支招大师微社区。'))
						window.location.href = configs.bbsUrl;
					else
						env.vars.selMenuItem(null);
				} break;
				case 7: {
					main.hideList();
					if (window.confirm('点击确定查看象棋支招大师使用帮助。'))
						window.location.href = configs.helpUrl;
					else
						env.vars.selMenuItem(null);
				} break;
			}
			if (mi.lstTpl)
				main.showList();
	    },
	    selectVip: function(id){
	    	if (!env.vars.inited)
	    		return;
	    	var vip = env.vars.getVip(id);
	    	if (vip === null)
	    		return;
			env.vars.selVip(vip);
			setTimeout(function(){
				env.stat.list_deep(1);
			}, 100);
	    },
	    selectVipMonth: function(vm){
	    	if (!env.vars.inited || env.stat.list_deep() == 0)
	    		return;
    		env.vars.selVipMonth(vm);
    		main.doPay();
	    },
	    selectGoldpay: function(gp){
	    	if (!env.vars.inited)
	    		return;
    		env.vars.selGoldpay(gp);
    		main.doPay();
	    },
	    curVipMonths: function(){
	    	var vip = env.vars.selVip();
	    	var months = [];
	    	for (var i = 0; vip && i < data.db.vip_payments.length; i++) {
	    		var p = data.db.vip_payments[i];
	    		if (p.id == vip.id){
	    			months.push(p);
	    		}
	    	};
	    	return months;
		},
		getSlotIcon: function(index){
			var mi = env.vars.selMenuItem();
			if (mi == null)
				return '';
			var slots = env.vars.kdata.db.slots();
			var slot = slots[index];
			if (slot.data() && slot.data().length){
				return 'slot_fill.png';
			}
			return 'slot_none.png';
		},
		getSlotDesc: function(index){
			var mi = env.vars.selMenuItem();
			if (mi == null)
				return '';
			var slots = env.vars.kdata.db.slots();
			var slot = slots[index];
			if (slot.data() && slot.data().length)
				return slot.redturn() ? '红先':'黑先';
			else if (mi.id == 4)
				return '保存到存档' + (index + 1);
			return '';
		},
		gotoUser: function(){
			window.location.href = 'user.html';
		}
	},
	stat: {
		scrsize: ko.observable({w: 0, h: 0}),
		scrscale: ko.observable(1),
		boardsize: ko.observable({w: 0, h: 0}),
		boardAspect: 640 / 722,
		touchBgn: ko.observable(null),
		list: ko.observable(0),// 0: hidden, 1: showing, 2: shown, 3: hiding
		list_deep: ko.observable(0),
		menu: ko.observable(0),
		menu_distshow: 60,
		movedPieceBar: false,
		savingOptionFunc: null,
		master: {
			retry: 0,
			pcounter: 0,
			breaking: 0,
			blocking: false,
			statusUp: ko.observable(''),
			statusDn: ko.observable(''),
		},
		ui: {}
	},
	evts: {
		onTouchCanvas: function(k, e){
			e.preventDefault();
			var state = this.stat.menu();
			if (state === 1 || state === 3)
				return;
			if (state === 2){
				this.stat.touchBgn(null);
				main.hideMenu();
			}else if (state == 0){
				this.stat.touchBgn({x: e.clientX, y: e.clientY});
			}
		},
		onTouchmoveCanvas: function(k, e){
			e.preventDefault();
			var bgn = this.stat.touchBgn();
			if (!bgn || this.stat.menu() != 0)
				return;
			var pos = {x: e.clientX, y: e.clientY};
			if (pos.x - bgn.x > this.stat.menu_distshow && pos.y - bgn.y < this.stat.menu_distshow){
				main.showMenu();
			}
		},
		onTouchendCanvas: function(k, e){
			e.preventDefault();
			this.stat.touchBgn(null);
		},
		onClickBuyVip: function(k, e){
			e.preventDefault();
			if (this.stat.list() == 0)
				main.showList();
			else if (this.stat.list() == 2)
				main.hideList();
		},
		onTouchMenu: function(k, e){
			e.preventDefault();
			this.stat.touchBgn({x: e.clientX, y: e.clientY});
		},
		onTouchmoveMenu: function(k, e){
			e.preventDefault();
			var bgn = this.stat.touchBgn();
			if (!bgn) return;
			var dir = 1;
			if (bgn.x <= env.stat.scrsize().w * 0.5)
				dir = -1;
			var pos = {x: e.clientX, y: e.clientY};
			var dy = Math.abs(pos.y - bgn.y);
			if (dy < this.stat.menu_distshow &&
				(dir > 0 && pos.x - bgn.x > this.stat.menu_distshow) || 
				(dir < 0 && pos.x - bgn.x < -this.stat.menu_distshow)) {
				main.hideMenu();
			}
		},
		onTouchendMenu: function(k, e){
			e.preventDefault();
			this.stat.touchBgn(null);
		},
		onClickTurn: function(k, e){
			e.preventDefault();
			if (env.vars.curOptMode() == 2)
				return;
			var turn = env.vars.kdata.user.opt_qset_redturn();
			env.vars.kdata.user.opt_qset_redturn(!turn);
			main.saveOptions();
		},
		onClickDepth: function(k, e){
			e.preventDefault();
			if (env.vars.curOptMode() == 2)
				return;
			var vip = env.vars.curVip();
	    	var list = [];
	    	for (var i = 0; i < data.db.gold_costs.length; i++) {
	    		var gc = data.db.gold_costs[i];
	    		if (gc.depth < 10 || gc.depth > vip.max_depth)
	    			continue;
	    		var txt = sprintf('%s 层 %s 金币', gc.depth, gc.amount)
				list.push(txt);
	    	};
	    	env.stat.ui.modalListMode(1);
	    	env.stat.ui.modalListItems(list);
	    	env.stat.ui.modalListTitle('计算深度');
	    	env.stat.ui.modalListHeight(env.stat.scrsize().h * 0.6);
			$('#dlgList').modal('show');
		},
		onClickUndo: function(k, e){
			e.preventDefault();
			board.undoSituation();
		},
		onClickRedo: function(k, e){
			e.preventDefault();
			board.redoSituation();
		},
		onClickSelEngine: function(k, e){
			e.preventDefault();
		},
		onClickMaster: function(k, e){
			e.preventDefault();
			var mode = env.vars.curOptMode();
			if (mode == 3)
				return;
			if (mode == 0)
				main.goMaster();
			else if (mode == 2)
				main.tryBreak();
		},
		onTouchPieceBar: function(k, e){
			e.preventDefault();
			env.stat.touchBgn({x: e.clientX, y: e.clientY});
			env.stat.movedPieceBar = false;
		},
		onTouchmovePieceBar: function(k, e){
			e.preventDefault();
			if (k.stat.touchBgn() == null)
				return;
			var bgn = k.stat.touchBgn();
			if (bgn.x < 0)
				return;
			var dx = e.clientX - bgn.x;
			if (Math.abs(dx) > 2){
				k.stat.movedPieceBar = true;
				var offset = k.stat.ui.pieceBarOffset() + dx;
				var fullw = k.stat.ui.pieceBarWidth();
				if (offset > 0 || fullw <= k.stat.scrsize().w)
					offset = 0;
				else if (offset < k.stat.scrsize().w - fullw)
					offset = k.stat.scrsize().w - fullw;
				k.stat.ui.pieceBarOffset(offset);
				bgn.x = e.clientX;
				k.stat.touchBgn(bgn);
			}
		},
		onTouchendPieceBar: function(k, e){
			e.preventDefault();
			if (k.stat.touchBgn() == null) return;
			k.stat.touchBgn(null);
			setTimeout(function(){
				env.stat.movedPieceBar = false;
			}, 500);
		},
		onClickBoard: function(k, e){
			e.preventDefault();
			if (env.stat.menu() != 0)
				return false;
			if (board.onClick(e)){
				k.evts.onBoardChanged(true);
				return true;
			}
			return false;
		},
		onClickDiedPiece: function(k, e){
			e.preventDefault();
			if (env.stat.movedPieceBar)
				return;
			var t = e.currentTarget || e.target;
			var idx = Number(t.attributes.index.value);
			if (idx == 0 && board.isPieceSelected())
				board.deletePiece(null, true);
			else{
				board.isPieceSelected() && (--idx);
				var ps = board.getDeletedGroupPieces();
				var p = ps[idx];
				board.movePiece(p, null, true);
			}
		},
		onClickEngine: function(){
			if (env.vars.curOptMode() == 2)
				return;
			var list = [];
	    	for (var i = 0; i < env.vars.curEngineList().length; ++i){
	    		list.push(env.vars.curEngineList()[i].text);
	    	}
	    	env.stat.ui.modalListMode(2);
	    	env.stat.ui.modalListItems(list);
	    	env.stat.ui.modalListTitle('选择引擎');
	    	env.stat.ui.modalListHeight(env.stat.scrsize().h * 0.6);
			$('#dlgList').modal('show');
		},
		onBoardChanged: function(forced){
			var lst = [{img:{src:'assets/images/delete.png'}, type: -1, side: 0}];
			var ps = board.getDeletedGroupPieces();
			env.vars.diedPieces([]);
			ps = board.isPieceSelected() ? lst.concat(ps) : ps;
			for (var i = 0; i < ps.length; i++) {
				env.vars.diedPieces.push(ps[i]);
			};
			var bs = board.getSituation();
			env.vars.kdata.user.last_situation(bs);
			localData.set('chessmaster_lastsituation', bs);
			if (!forced && env.vars.curOptMode() != 2){
				main.saveOptions();
			}
		},
		onPressButton: function(bn, pressed, k){
			if (env.vars.curOptMode() == 2)
				return;
			env.stat.ui.pressedButton({name: bn, state: pressed});
		},
		onChoseModalItem: function(k){
			var mode = env.stat.ui.modalListMode();
			if (mode == 1){
				var k = Number(k.split(' ')[0]);
				env.stat.ui.chosenModalItem(k - 9);
				env.vars.kdata.user.opt_qset_depth(k);
			}else if (mode == 2){
	    		for (var i = 0; i < env.vars.curEngineList().length; ++i) {
					var itm = env.vars.curEngineList()[i];
	    			if (itm.text == k){
						env.vars.kdata.user.opt_qset_engine(itm.key);
						env.stat.ui.chosenModalItem(i + 1);
						break;
	    			}
	    		}
			}
			setTimeout(function(){
				$('#dlgList').modal('hide');
				env.stat.ui.modalListMode(0);
			}, 100);
			main.saveOptions();
		},
		onStartCalculation: function(){
			main.cancelBeatHeart();
			env.stat.master.retry = 0;
			board.freeze(true);
			board.clearMarks();
			board.saveSituation();
			main.updateCalculateStatus(0, '');
			main.obtainResult();
		},
		onFinishCalculation: function(succeeded, result, score){
			var uinfo = env.vars.kdata.user;
			if (succeeded){
				if (result == '[ERROR]'){
					succeeded = false;
					board.restoreSituation();
					env.stat.master.statusDn('支招失败');
					main.showTooltip('服务器意外终止，支招失败，请稍后再试。');
				}else{
					env.stat.master.statusDn('支招成功');
					env.stat.master.statusUp('');
					board.setCurrMove(result, uinfo.opt_master_automove(), true);
				}
				if (uinfo.opt_master_autoswitch())
					uinfo.opt_qset_redturn(uinfo.opt_qset_redturn() ? 0 : 1);
				if (score){
					main.showTooltip('本次支招分值：' + score);
					env.stat.master.statusUp('分值：' + score);
				}
			}else{
				if (result && result.length){
					main.showTooltip(result);
				}
				if (env.stat.master.blocking){
					env.stat.master.statusUp('');
					env.stat.master.statusDn('');
				}
			}
			env.stat.master.pcounter = 0;
			env.stat.master.breaking = 0;
			env.stat.master.blocking = false;
			board.freeze(false);
			env.vars.curOptMode(0);
			main.beatHeart();
		},
		onClickSlot: function(k, e){
			var t = e.currentTarget || e.target;
			var idx = Number(t.attributes.index.value);
			env.vars.selSlotIndex(idx);
			console.log(idx);
			if (idx < 0 || env.vars.selMenuItem().id == 3)
				main.loadFromSlot(idx);
			else
				main.saveToSlot(idx);
			setTimeout(function(){env.vars.selSlotIndex(-99)}, 1000);
		},
		onClickMenuArrow: function(k, e){
			if (!env.evts.onClickBoard(k, e)){
				main.showMenu();
			}
		}
	}
});

var main = (function(){
	var tipHidingFunc, beatHeartFunc;
	return {
		init: function(){
			$('.sec').css({display: 'block'});
			var size = {w: $(window).width(), h: $(window).height()};
			env.stat.scrscale(size.w / 640);
			env.stat.scrsize(size);
			env.stat.ui.titleH = ko.computed(function(){
				return 100 * this.stat.scrscale();
			}, env);
			env.stat.ui.topSidePad = ko.computed(function(){
				return 0.15 * this.stat.ui.titleH();
			}, env);
			env.stat.ui.topMidPad = ko.computed(function(){
				return 0.06 * this.stat.ui.titleH();
			}, env);
			env.stat.ui.topInnerH = ko.computed(function(){
				return this.stat.ui.titleH() - 2 * this.stat.ui.topSidePad();
			}, env);
			env.stat.ui.topLineH = ko.computed(function(){
				return this.stat.ui.topInnerH() * 0.5;
			}, env);
			env.stat.ui.bottomH = ko.computed(function(){
				return 80 * this.stat.scrscale();
			}, env);
			env.stat.ui.bottomPad = ko.computed(function(){
				return 0.1 * this.stat.ui.bottomH();
			}, env);
			env.stat.ui.bottomInnerH = ko.computed(function(){
				return this.stat.ui.bottomH() - 2 * this.stat.ui.bottomPad();
			}, env);
			env.stat.ui.bottomMidLineH = ko.computed(function(){
				return this.stat.ui.bottomInnerH() * 0.5;
			}, env);
			env.stat.ui.menuSize = ko.computed(function(){
				var sz = this.stat.scrsize();
				return {w: sz.w * 0.5, h: sz.h};
			}, env);
			env.stat.ui.pieceBarInnerH = ko.computed(function(){
				return this.stat.ui.bottomInnerH();
			}, env);
			env.stat.ui.pieceBarWidth = ko.computed(function(){
				return this.stat.ui.pieceBarInnerH() * this.vars.diedPieces().length + env.stat.ui.bottomPad() * 2;
			}, env);
	    	env.stat.ui.pieceBarOffset = ko.observable(0);
	    	env.stat.ui.pressedButton = ko.observable({name: null, state: 0});
	    	env.stat.ui.pressedBnSuffix = function(bn){
	    		var pb = env.stat.ui.pressedButton();
	    		if (pb.name == bn && pb.state == 1)
	    			return '_p';
	    		return '';
	    	};
	    	env.stat.ui.modalListTitle = ko.observable('请选择');
	    	env.stat.ui.modalListMode = ko.observable(0);
	    	env.stat.ui.modalListItems = ko.observableArray([]);
	    	env.stat.ui.modalListHeight = ko.observable(0);
	    	env.stat.ui.chosenModalItem = ko.observable(-1);
			$('#sec_list').css({
				left: env.stat.scrsize().w
			});

			var boardMaxH = size.h - env.stat.ui.titleH() - env.stat.ui.bottomH();
			var nowAspt = size.w / boardMaxH;
			var bw = size.w, bh = boardMaxH;
			if (env.stat.boardAspect < nowAspt)
				bw = bh * env.stat.boardAspect;
			else
				bh = bw / env.stat.boardAspect;
			env.stat.boardsize({w: bw, h: bh});
			env.stat.board_fullh = ko.computed(function(){
				return this.stat.scrsize().h - env.stat.ui.titleH() - env.stat.ui.bottomH();
			}, env);
			var slots_all = [];
			for (var i = 0; i < data.user.slot_count; i++) {
				var found = false;
				for (var j = 0; !found && j < data.slots.length; j++) {
					var s = data.slots[j];
					if (s.slot_id == i){
						found = true;
						slots_all.push(s);
					}
				};
				if (!found){
					slots_all.push({
						id: data.user.id,
						slot_id: i,
						name: '存档' + (i+1),
						data: null,
						redturn: 1
					});
				}
			};
			data.db.slots = slots_all;
			this.remapData();
			console.log(env.vars.kdata);
			env.vars.menuItems = ko.observableArray(env.vars.menuItems_data);

			env.vars.curVip = ko.computed(function(){
				return env.vars.getVip(env.vars.kdata.user.vip_level());
			}, env);
			env.vars.curCost = ko.computed(function(){
				var d = this.vars.kdata.user.opt_qset_depth();
				for (var i = 0; i < data.db.gold_costs.length; i++) {
		    		var gc = data.db.gold_costs[i];
		    		if (gc.depth == d)
		    			return gc.amount;
	    		}
	    		return 0;
			}, env);
			env.vars.kdata.user.opt_reverseview.subscribe(function(newVal){
				board.reverseSituation(newVal);
				main.saveOptions();
			});
			env.vars.kdata.user.opt_opensound.subscribe(function(newVal){
				board.mute(!newVal);
				main.saveOptions();
			});

			ko.applyBindings(env);

			board.init($('#board-canvas')[0]);
			var situation = localData.get('chessmaster_lastsituation');
			if (situation == null || !situation.length)
				situation = data.user.last_situation;
			if (situation == null || !situation.length)
				situation = boardset.situation_open;
			board.setSituation(situation, true);
			board.reverseSituation(data.user.opt_reverseview);
			board.mute(!data.user.opt_opensound);

			env.vars.inited = true;
			this.detectLoginPresents();
			this.beatHeart();
		},
		detectLoginPresents: function(){
			var tip = '';
			var ps = data.presents;
			for (var i = 0; ps && i < ps.length; i++) {
				var p = ps[i];
				var evt = '', obj = '';
				if (p.event_id == 1)
					evt = '首次登录';
				else if (p.event_id == 2)
					evt = '今日签到';
				if (p.item_type == 0)
					obj = '金币';
				else
					continue;
				if (tip.length > 0)
					tip += '<br>';
				tip += sprintf('您%s获得了%d%s！', evt, p.amount, obj);
			};
			(tip.length > 0) && this.showTooltip(tip);
		},
		beatHeart: function(){
			beatHeartFunc = null;
			if (!data || !data.user) return;
			app.callajax('Player/BeatHeart', {
				player_id: data.user.id
			}, function(s, e){
				beatHeartFunc = setTimeout(function(){main.beatHeart();}, env.vars.timeSpans.beatHeart / 4);
				console.log(e);
				// app.quit('与服务器通信失败，请稍后再试。点击确定关闭页面。');
			}, function(resp){
				try{
					if (!resp.success){
						alert(app.getPromptMessage(resp.message));
						app.quit();
						return;
					}
					data.engines = $.parseJSON(resp.engines);
					main.statEngines();
				}catch(ex){
					console.log(ex);
				}
				beatHeartFunc = setTimeout(function(){main.beatHeart();}, env.vars.timeSpans.beatHeart);
			});
		},
		cancelBeatHeart: function(){
			beatHeartFunc && clearTimeout(beatHeartFunc);
			beatHeartFunc = null;
		},
		remapData: function(){
			env.vars.kdata = ko.mapping.fromJS(data);
		},
		statEngines: function(){
			env.vars.curEngineList([]);
			var curId = env.vars.kdata.user.opt_qset_engine();
			var edata = data.engines;
			var foundEng = null;
			for (var i = 0; i < edata.org.length; i++) {
				var eng = {
					key: edata.org[i].tid * -1,
					text: '支招大师'+edata.org[i].tid+'号'
				};
				env.vars.curEngineList.push(eng);
				if (!foundEng && curId < 0 && curId == edata.org[i].tid * -1)
					foundEng = eng;
			};
			for (var i = 0; i < edata.engines.length; i++) {
	    		var e = app.getEngine(edata.engines[i].id);
	    		if (e == null)
	    			continue;
	    		var eng = {
					key: edata.engines[i].id,
					text: sprintf('%s (%d)', e.name, edata.engines[i].count)
				};
				env.vars.curEngineList.push(eng);
				if (!foundEng && curId > 0 && curId == edata.engines[i].id)
					foundEng = eng;
    		}
			var autoEng = {
				key: 0,
				text: '(自动选择引擎)'
			};
			env.vars.curEngineList.unshift(autoEng);
    		if (foundEng){
    			env.vars.kdata.user.opt_qset_engine(foundEng.key);
				env.vars.curEngine(foundEng.text);
    		}
    		else {
				env.vars.kdata.user.opt_qset_engine(autoEng.key);
				env.vars.curEngine(autoEng.text);
			}
		},
		showMenu: function(){
			env.stat.menu(1);
			env.vars.selectMenuItem(-1);

			$('#menu_img_1').attr({src: 'assets/images/vip' + env.vars.curVip().id + '.png'});
			$('#menu_name_1').html(env.vars.curVip().name);
			$('#menu_name_2').html(env.vars.kdata.user.golds());
			// var lst = env.vars.menuItems_data;
			// lst[0].name = env.vars.curVip().name;
			// lst[0].logo = 'vip' + env.vars.curVip().id + '.png';
			// lst[1].name = env.vars.kdata.user.golds();
			// env.vars.menuItems(lst);
			$('#sec_menu').animate({
				left: 0
			}, 200, function(){
				env.stat.menu(2);
			});
		},
		hideMenu: function(){
			main.hideList();
			env.stat.menu(3);
			$('#sec_menu').animate({
				left: -env.stat.scrsize().w * 0.5
			}, 200, function(){
				env.stat.menu(0);
			});
		},
		showList: function(){
			if (env.stat.list() != 0)
				return;
			env.stat.list(1);
			$('#sec_list').animate({
				left: env.stat.scrsize().w * 0.5
			}, 200, function(){
				env.stat.list(2);
			});
		},
		hideList: function(){
			if (env.stat.list() != 2)
				return;
			env.stat.list(3);
			$('#sec_list').animate({
				left: env.stat.scrsize().w
			}, 200, function(){
				env.stat.list(0);
			});
		},
		saveOptions: function(syncnow){
			if (!env.vars.inited)
				return;
			if (env.stat.savingOptionFunc){
				clearTimeout(env.stat.savingOptionFunc);
				env.stat.savingOptionFunc = null;
			}
			var span = syncnow ? 0 : (5 * 1000);
			env.stat.savingOptionFunc = setTimeout(function(){
				var du = env.vars.kdata.user;
				app.callajax('Player/SaveOptions', {
					player_id: du.id(),
					situation: du.last_situation(),
					qset_engine: du.opt_qset_engine(),
					qset_depth: du.opt_qset_depth(),
					qset_redturn: du.opt_qset_redturn(),
					reverseview: du.opt_reverseview(),
					opensound: du.opt_opensound(),
					master_autoswitch: du.opt_master_autoswitch(),
					master_automove: du.opt_master_automove(),
					master_animation: du.opt_master_animation(),
				}, function(s, e){
					console.error('saveoptions:', e);
				}, function(resp){
					console.log('saveoptions:', resp);
				});
				env.stat.savingOptionFunc = null;
			}, span);
		},
		updateCalculateStatus: function(depth, result, blocked){
			env.stat.master.blocking = blocked;
			var status = '';
			if (env.stat.master.breaking == 1)
				status = '请求中断';
			else if (env.stat.master.breaking == 2)
				status = '正在中断';
			else if (blocked)
				status = '等待服务器响应';
			else
				status = '支招计算中';
			if (++env.stat.master.point_counter > 3)
				env.stat.master.point_counter = 1;
			for (var i = 0; i < env.stat.master.point_counter; i++)
				status += '.';
			env.stat.master.statusDn(status);

			var depthstr;
			if (!blocked)
				depthstr = sprintf('第%d/%d层', depth, env.vars.kdata.user.opt_qset_depth());
			else{
				if (depth <= 0)
					depthstr = '请稍候';
				else
					depthstr = sprintf('还有%d个人', depth);
			}
			env.stat.master.statusUp(depthstr);
			if (result && env.vars.kdata.user.opt_master_animation()){
				result.length > 0 && board.setCurrMoves(result);
			}
		},
		goMaster: function(){
			if (env.vars.curOptMode() != 0)
				return;
			var userinfo = env.vars.kdata.user;
			if (env.vars.curEngineList().length == 0){
				main.showTooltip('当前还没有可为您服务的支招引擎！');
				return;	
			}
			env.vars.curOptMode(2);
			if (userinfo.golds() < env.vars.curCost()){
				main.showTooltip('您的金币不够此次支招！');
				env.vars.curOptMode(0);
				return;
			}
			this.cancelBeatHeart();
			app.callajax('Master/Go', {
                player_id: userinfo.id(),
                places: board.getSituation(),
                redturn: userinfo.opt_qset_redturn(),
                depth: userinfo.opt_qset_depth(),
                engine: userinfo.opt_qset_engine()
			}, function(s, e){
				if (++env.stat.master.retry > 3){
					env.evts.onFinishCalculation(false, '服务器暂时没有响应，请稍后再试！');
				}
				else {
					setTimeout(function(){
						main.goMaster();
					}, env.vars.timeSpans.retryGo);
				}
			}, function(resp){
				if (!resp.success){
					env.evts.onFinishCalculation(false, app.getPromptMessage(resp.message));
				}
				else {
					env.vars.kdata.user.golds(resp.curgolds);
					env.evts.onStartCalculation();
				}
			});
		},
		obtainResult: function(){
			app.callajax('Master/Obtain', {
				player_id: env.vars.kdata.user.id(),
			}, function(s, e){
				console.error(s, e);
				setTimeout(function(){
					main.obtainResult();
				}, env.vars.timeSpans.requireResult);
			}, function(resp){
				if (!resp.success){
					env.evts.onFinishCalculation(false, '支招失败或发生异常，请稍后再试。');
				}
				else {
					main.dealResult(resp.result);
				}
			});
		},
		dealResult: function(rstData){
			var state = 0;
			var rst = $.parseJSON(rstData);
			if (rst){
				if (rst.state == 3)
					env.evts.onFinishCalculation(true, rst.result, rst.score);
				else if (rst.state == 2)
					this.updateCalculateStatus(rst.depth, rst.result);
				else if (rst.state == -1)
					this.updateCalculateStatus(rst.depth, null, true);
				else if (env.stat.master.blocking && (rst.state == 0 || rst.state == 1)){
					env.evts.onFinishCalculation(false);
					return;
				}
			}
			if (rst.state != 3) {
				setTimeout(function(){
					if (env.stat.master.breaking){
						main.doBreak();
						setTimeout(function(){
							main.obtainResult();
						}, env.vars.timeSpans.requireResult);
					}
					else{
						main.obtainResult();
					}
				}, 1500);
			}
		},
		showTooltip: function(msg, stayTime, fadeTime, doMask){
			var msg_cur = $('#tooltip p').html();
			if (msg === msg_cur)
				fadeTime = 0;
			tipHidingFunc && this.hideTooltip(0);
			fadeTime === undefined && (fadeTime = 1);
			stayTime === undefined && (stayTime = 3);
			$('#tooltip p').html(msg);
			if (doMask) $('#fullmasker').show();
			$('#tooltip').fadeIn(fadeTime);
			tipHidingFunc = setTimeout(function(){
				$('#tooltip').fadeOut(fadeTime * 1000);
				$('#fullmasker').hide();
			}, stayTime * 1000);
		},
		hideTooltip: function(fadeTime){
			fadeTime === undefined && (fadeTime = 0);
			tipHidingFunc && clearTimeout(tipHidingFunc);
			tipHidingFunc = null;
			$('#tooltip').fadeOut(fadeTime * 1000);
			$('#fullmasker').hide();
		},
		tryBreak: function(){
			if (env.stat.master.breaking == 0){
				env.stat.master.breaking = 1;
				env.stat.master.statusDn('请求中断');
			}
		},
		doBreak: function(){
			if (env.vars.curOptMode() != 2 || env.stat.master.breaking != 1)
				return;
			env.stat.master.breaking = 2;
			env.stat.master.statusDn('正在中断...');
			app.callajax('Master/Break', {
				player_id: data.user.id,
			}, function(s, e){
				console.error('break failed:', e);
				alert(errorstr('break', null, s, e));
			}, function(resp){
				if (!resp.success)
					main.showTooltip(app.getPromptMessage(resp.message));
			});
		},
		getSlot: function(id, notEmpty){
			var slots = env.vars.kdata.db.slots();
			for (var i = 0; i < slots.length; i++) {
				var pr = slots[i];
				if (notEmpty && (!pr.data() || !pr.data().length))
					continue;
				if (pr.slot_id() == id){
					return pr;
				}
			};
			return null;
		},
		loadFromSlot: function(id){
			if (id == -2)
				board.setSituation(boardset.situation_open);
			else if (id == -1)
				board.setSituation(boardset.situation_close);
			else{
				var pr = this.getSlot(id, true);
				if (pr == null)
					return;
				board.setSituation(pr.data());
			}
			board.clearSituationQueue();
			board.playSound('new');
			setTimeout(function(){main.hideMenu();}, 100);
		},
		saveToSlot: function(id){
			var pr = this.getSlot(id, true);
			if (pr){
				if (!window.confirm('确定覆盖到该存档吗？'))
					return;
			}
			var name = window.prompt('给这个棋局起个名字：', '未命名棋局');
            if (!name)
            	return;
            var userinfo = env.vars.kdata.user;
            var slot_data = board.getSituation();
            app.callajax('Player/FillSlot', {
            	player_id: userinfo.id(),
				slot_id: id,
				name: name,
				data: slot_data,
				redturn: userinfo.opt_qset_redturn()
            }, function(s, e){
				alert(errorstr('save-slot', null, s, e));
            }, function(resp){
            	if (!resp.success)
					alert(app.getPromptMessage(resp.message));
				else{
					var slots = env.vars.kdata.db.slots();
					for (var i = 0; i < slots.length; i++) {
						var slot = slots[i];
						if (slot.slot_id() == id){
							slot.name(name);
							slot.data(slot_data);
							slot.redturn(userinfo.opt_qset_redturn());
							setTimeout(function(){main.hideMenu();}, 200);
							break;
						}
					};
				}
            });
		},
		doPay: function(){
			var opt = env.vars.curOptMode();
			if (opt == 1 || opt == 2){
				this.showTooltip('请在布子或支招结束后操作～');
				return;
			}else if (opt == 3)
				return;
			this.onBeginPay();
			var total_money = 1;
			var product_id = '';
			var product_desc = '';
			env.vars.curPayAttach = randomString(32);
			var selMi = env.vars.selMenuItem();
			if (!selMi)
				return;
			if (selMi.id == 2){
				var gp = env.vars.selGoldpay();
				if (gp == null)
					return;
				product_id = sprintf('G%sP%s', gp.amount(), gp.presents());
				// product_desc = sprintf('象棋支招大师%s金币', gp.amount());
				product_desc = '象棋支招大师金币';
				if (gp.presents > 0)
					product_desc += sprintf('（赠%s）', gp.presents());
				// total_money = gp.rmb() * 100;
			}
			else if (selMi.id == 1){
				var vm = env.vars.selVipMonth();
				if (vm == null)
					return;
				product_id = sprintf('V%sM%s', vm.id, vm.month);
				// product_desc = sprintf('象棋支招大师%s（%s个月）', data.db.vips[vm.id-1].name, vm.month);
				product_desc = '象棋支招大师升级会员';
				// total_money = vm.rmb * 100;
			}

			$.ajax({
				url: 'weixinpay/js_api_call.php',
				type: 'get',
				data: {
					openid: data.user.openid,
					product_desc: product_desc,
					total_fee: total_money,
					product_id: product_id,
					attach: env.vars.curPayAttach
				},
				dataType: 'json',
				error: function(r, s, e){
					main.onFinishPay('支付失败: ' + e.message);
				},
				success: function(data){
					wx.chooseWXPay({
					    timeStamp: data.timeStamp,//为了将来别再改成大写，大小写两种都给出来吧还是
					    timestamp: data.timeStamp,//微信NMLGBD，这个小写的s让我调了两天！
					    nonceStr: data.nonceStr,
						package: data.package,
					    signType: data.signType,
					    paySign: data.paySign,
					    cancel: function(){
							main.onFinishPay(null, true);
					    },
					    fail: function(res){
							main.onFinishPay(JSON.stringify(res), true);
					    },
					    success: function(res){
							if (res.errMsg == 'chooseWXPay:ok')
								main.doRequirePayResult();
							else
								main.onFinishPay('支付失败: '+res.errMsg);
					    }
					});
				}
			});
		},
		doRequirePayResult: function(){
			this.showTooltip('正在确认支付结果...', 3600, 1, true);
			app.callajax('Player/GetPay', {
				openid: data.user.openid,
				attach: env.vars.curPayAttach
			}, function(s, e){
				setTimeout(function(){main.doRequirePayResult();}, env.vars.timeSpans.requirePay);
			}, function(resp){
				if (!resp.success)
					setTimeout(function(){main.doRequirePayResult();}, env.vars.timeSpans.requirePay);
				else {
					// data.user = $.parseJSON(resp.userinfo);
					// main.remapData();
					try{
						var uinfo = $.parseJSON(resp.userinfo);
						env.vars.kdata.user.golds(uinfo.golds);
						env.vars.kdata.user.vip_level(uinfo.vip_level);
						env.vars.kdata.user.vip_months(uinfo.vip_months);
						env.vars.kdata.user.vip_endtime(uinfo.vip_endtime);
					}catch(ex){
						alert('pay exception:' + JSON.stringify(ex));
					}
					main.onFinishPay('支付成功！');
				}
			});
		},
		onBeginPay: function(){
			env.vars.curOptMode(3);
			this.showTooltip('请求支付，请稍候...', 3600, 1, true);
		},
		onFinishPay: function(msg, keepMenu){
			env.vars.curOptMode(0);
			env.vars.selVipMonth(null);
			env.vars.selGoldpay(null);
			if (!keepMenu)
				this.hideMenu();
			if (!msg)
				this.hideTooltip();
			else
				this.showTooltip(msg);
		},
	}
})();

$(function(){
	app.login(function(){
		main.init();
	}, true);
});
