
var boardset = {
	toggles: {
        board_reverse_side: 1,
        board_reverse_shift: 2,
        board_audio: 4,
        master_redturn: 1024,
        master_autoswitch: 2048,
        master_automove: 4096,
        master_animation: 8192,
	},
	indices: [
        1, 2, 3, 4, 0, 4, 3, 2, 1, 5, 5, 6, 6, 6, 6, 6,//0将1車2马3象4士5炮6卒
	],
	def_locations: [
        { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, // 車马象
        { x: 3, y: 0 }, { x: 4, y: 0 }, { x: 5, y: 0 }, // 士将士
        { x: 6, y: 0 }, { x: 7, y: 0 }, { x: 8, y: 0 }, // 象马車
        { x: 1, y: 2 }, { x: 7, y: 2 },                 // 炮炮
        { x: 0, y: 3 }, { x: 2, y: 3 }, { x: 4, y: 3 }, { x: 6, y: 3 }, { x: 8, y: 3 },// 卒卒卒卒卒
	],
	situation_open: 'rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR',
	situation_close: '4k4/9/9/9/9/9/9/9/9/5K3',
	animation_speed: 0.08,
	limits: [
        {//将
            mode: 2,
            area: { x1: 3, x2: 5, y1: 0, y2: 2 },
            sign: 'k'
        },
        {//車
            mode: 0,
            sign: 'r'
        },
        {//马
            mode: 0,
            sign: 'n'
        },
        {//相
            mode: 1,
            pos: [
                { x: 2, y: 0 }, { x: 6, y: 0 },
                { x: 0, y: 2 }, { x: 4, y: 2 }, { x: 8, y: 2 },
                { x: 2, y: 4 }, { x: 6, y: 4 },
            ],
            sign: 'b'
        },
        {//士
            mode: 1,
            pos: [
                { x: 3, y: 0 }, { x: 5, y: 0 },
                { x: 4, y: 1 },
                { x: 3, y: 2 }, { x: 5, y: 2 },
            ],
            sign: 'a'
        },
        {//炮
            mode: 0,
            sign: 'c'
        },
        {//卒
            mode: 3,
            pos: [
                { x: 0, y: 3 }, { x: 2, y: 3 }, { x: 4, y: 3 }, { x: 6, y: 3 }, { x: 8, y: 3 },
                { x: 0, y: 4 }, { x: 2, y: 4 }, { x: 4, y: 4 }, { x: 6, y: 4 }, { x: 8, y: 4 },
            ],
            area: { x1: 0, x2: 8, y1: 5, y2: 9 },
            sign: 'p'
        }
	],
	boardSize: {w: 589, h: 653},
	pieceImage: null,
	pieceSize: 60,
	gridBeginPos: { x: 44, y: 44 },
	gridSize: 62,
	gridCount: { w: 9, h: 10 },
};

var board = (function(){
	var mCanvas, mImage, mContext, 
	mImgCursors = [],
	mScale = 1, mBlackThenRed = true,
	mOperationEnabled = true,
	mSoundEnabled = true,
	mContentSize = {w: 0, h: 0},
	mPieces = [],
	mPieceSize, mBgnPos, mGridSize,
	mSelectedPiece = null,
	mSelectedGrid = null,
	mLastTouchTime = 0,
	mLastBatchMoveStr = '',
	mBatchMoves = [],
	mBatchMoveIndex = -1,
	mBatchMoveFunc = null,
	mMovingQueue = [],
	mMarkingLocations = [],// t=> 0: 棋子标记, 1: 可落子标记, 2: 支招棋子标记, 3: 支招棋子目标标记
	mSituationQueue = [], mSituationIndex = -1;

	return {
		init: function(canvas) {
			mCanvas = canvas;
			mContext = canvas.getContext("2d");
			mContentSize = {w: mCanvas.width, h: mCanvas.height};
			mScale = mContentSize.w / boardset.boardSize.w;
			mPieceSize = boardset.pieceSize * mScale;
			mBgnPos = {
				x: boardset.gridBeginPos.x * mScale - mPieceSize * 0.5,
				y: boardset.gridBeginPos.y * mScale - mPieceSize * 0.5
			};
			mGridSize = boardset.gridSize * mScale;

			var count = boardset.indices.length;
			mPieces.length = count * 2;
			for (var i = 0; i < mPieces.length; ++i) {
				var p = {
					idx: i,
					type: boardset.indices[i % count],
					loc: { x: 0, y: 0 },
					pos: { x: 0, y: 0 },
					from: null,
					rate: 0,
					state: 1,//0:被删除,1:健在
					side: (i >= count ? 1 : -1)
				};
				mPieces[i] = p;
			}
			this.resetSituation();
			boardset.pieceImage = new Image();
			boardset.pieceImage.src = 'assets/images/chess.png';
			boardset.pieceImage.onload = function(){
				board.draw();
			}

			mImgCursors.length = 2;
			mImgCursors[0] = new Image();
			mImgCursors[0].src = "assets/images/cursor1.png";
			mImgCursors[1] = new Image();
			mImgCursors[1].src = "assets/images/cursor2.png";
			// mImage = new Image();
			// mImage.src = "assets/images/board_grid.png";
		},
		freeze: function(freeze){
			mOperationEnabled = !freeze;
		},
		clearMarks: function(){
			mMarkingLocations.length = 0;
			this.draw();
		},
		mute: function(muted){
			mSoundEnabled = !muted;
		},
		draw: function() {
			if (!mContext)
				return;
			var needredraw = false;
			mContext.clearRect(0, 0, mCanvas.width, mCanvas.height);
			// 解决有些手机clearRect无效的问题
			mCanvas.style.display = 'none';// Detach from DOM
			mCanvas.offsetHeight; // Force the detach  
			mCanvas.style.display = 'inherit'; // Reattach to DOM  
			// mContext.drawImage(mImage, 0, 0, mImage.width, mImage.height, 0, 0, mCanvas.width, mCanvas.height);

			for (var i = 0; i < mPieces.length; ++i) {
				var p = mPieces[i];
				if (p.state != 1)
					continue;
				var bx = p.loc.x, by = p.loc.y;
				if (p.from == null)
					p.rate = 1;
				else {
					p.rate < 1 && (needredraw = true);
					p.rate += boardset.animation_speed;
					p.rate > 1 && (p.rate = 1);
					bx = (p.loc.x - p.from.x) * p.rate + p.from.x;
					by = (p.loc.y - p.from.y) * p.rate + p.from.y;
					p.rate == 1 && (p.from = null);
				}
				p.pos.x = mBgnPos.x + bx * mGridSize;
				p.pos.y = mBgnPos.y + by * mGridSize;
				var offset = {x: p.type * boardset.pieceSize, y: boardset.pieceSize * (p.side < 0 ? 0 : 1)};
				mContext.drawImage(boardset.pieceImage, offset.x, offset.y, boardset.pieceSize, boardset.pieceSize, p.pos.x, p.pos.y, mPieceSize, mPieceSize);
			}
			for (var i = 0; i < mMarkingLocations.length; ++i) {
				var ml = mMarkingLocations[i];
			    var x = mBgnPos.x + ml.x * mGridSize;
			    var y = mBgnPos.y + ml.y * mGridSize;
			    if (ml.t == 1) continue;// Modify: 暂时不显示绿色标志
			    mContext.drawImage(mImgCursors[ml.t], 0, 0, mImgCursors[ml.t].width, mImgCursors[ml.t].height, x, y, mPieceSize, mPieceSize);
			}
			needredraw && setTimeout(function(){
				board.draw();
			}, 50);
		},
		getGrid: function(x, y){
			var r = mPieceSize * 0.5;
			x -= mBgnPos.x + r;
			y -= mBgnPos.y + r;
			for (var i = 0; i < boardset.gridCount.h; ++i) {
				var gy = i * mGridSize;
				var t = gy - r;
				for (var j = 0; y >= t && j < boardset.gridCount.w; ++j) {
					var gx = j * mGridSize;
					var l = gx - r;
					if (x >= l && x <= l + r * 2 && y <= t + r * 2){
						return {x: j, y: i};
					}
				}
			};
			return null;
		},
		getPieceOnLocation: function (x, y) {
		    for (var i = 0; i < mPieces.length; ++i) {
		        var p = mPieces[i];
		        if (p.state != 0 && p.loc.x == x && p.loc.y == y)
		            return i;
		    }
		    return -1;
		},
		getPieceOnPixel: function(x, y){
			var r = mPieceSize * 0.5;
			for (var i = 0; i < mPieces.length; ++i) {
				var p = mPieces[i];
				if (p.state != 1)
					continue;
				var l = p.pos.x, t = p.pos.y;
				if (x >= l && x <= l + r * 2 && y >= t && y <= t + r * 2){
					return p;
				}
			}
			return null;
		},
		getDeletedPieces: function(){
			var lst = [];
			for (var i = 0; i < mPieces.length; ++i) {
				var p = mPieces[i];
				if (p.state == 0)
					lst.push(p);
			}
			return lst;
		},
		getDeletedGroupPieces: function(){
			var lst = [], ks = [];
			for (var i = 0; i < mPieces.length; ++i) {
				var p = mPieces[i];
				if (p.state == 0){
					var k = p.type * p.side;
					if (ks.indexOf(k) >= 0)
						continue;
					lst.push(p);
					ks.push(k);
				}
			}
			return lst;
		},
		deletePiece: function(p, redraw, donotrecord){
			if (p == null)
				p = mSelectedPiece;
			if (p == null || p.state == 0)
				return;
			p.state = 0;
			p.loc = {x: -1, y: -1};
			if (p == mSelectedPiece){
				mSelectedPiece = null;
				mMarkingLocations.length = 0;
				env.vars.curOptMode(0);
			}
			redraw && this.draw();
			env.evts.onBoardChanged();
			if (!donotrecord)
				this.pushSituation();
			this.playSound('eat');
		},
		movePiece: function(p, loc, redraw){
			if (loc == null){
				if (mSelectedPiece)
					loc = mSelectedPiece.loc;
				else if (mSelectedGrid)
					loc = mSelectedGrid;
				else
					return;
			}
			var i = this.getPieceOnLocation(loc.x, loc.y);
			var eating = i >= 0;
			if (eating)
				this.deletePiece(mPieces[i], false, true);
			if (mSelectedGrid){
				mSelectedGrid = null;
				mMarkingLocations.length = 0;
				env.vars.curOptMode(0);
			}
			p.loc = loc;
			p.state = 1;
			redraw && this.draw();
			env.evts.onBoardChanged();
			this.pushSituation();
			if (eating)
				this.playSound('eat');
			else
				this.playSound('move1');
		},
		isPieceSelected: function(){
			return mSelectedPiece ? true : false;
		},
		onClick: function(e){
			if (!mOperationEnabled) return false;
			var gloc = this.getGrid(e.clientX - mCanvas.offsetLeft, e.clientY - mCanvas.offsetTop);
			if (mSelectedPiece != null){
				//上次已选子
				var time = (new Date()).getTime();
				if (time - mLastTouchTime < 250 && mSelectedPiece.type != 0){
					// 双击删除
					this.deletePiece(mSelectedPiece);
				}else{
					if (gloc != null){
						// 点击格
						for (var i = 0; i < mMarkingLocations.length; i++) {
							var ml = mMarkingLocations[i];
							if (ml.t == 1 && ml.x == gloc.x && ml.y == gloc.y){
								// 为可走格 -> 移动子
								this.movePiece(mSelectedPiece, gloc);
								break;
							}
						};
						mSelectedPiece = null;
						mMarkingLocations.length = 0;
						env.vars.curOptMode(0);
					}
				}
				mLastTouchTime = 0;
			} else {
				//上次未选子
				mMarkingLocations.length = 0;
				mSelectedPiece = this.getPieceOnPixel(e.clientX - mCanvas.offsetLeft, e.clientY - mCanvas.offsetTop);
				if (mSelectedPiece != null){
					// 点击新子
					mMarkingLocations.push({x: mSelectedPiece.loc.x, y: mSelectedPiece.loc.y, t: 0});
					this.markTargetLocations();
					mLastTouchTime = (new Date()).getTime();
					env.vars.curOptMode(1);
					this.playSound('select');
				}else if (this.getDeletedPieces().length > 0){
					// 点击空白 & 存在删子
					if (mSelectedGrid){
						// 上次已选格 -> 取消选格
						mSelectedGrid = null;
						env.vars.curOptMode(0);
					}else if (gloc != null){
						// 点击格 & 上次未选格 -> 选格
						mSelectedGrid = gloc;
						mMarkingLocations.push({x: gloc.x, y: gloc.y, t: 0});
						env.vars.curOptMode(1);
					}else{
						return false;
					}
				}else{
					return false;
				}
			}

			this.draw();
			return true;
		},
		playSound: function(name){
			if (!mSoundEnabled)
				return;
			var elem = $('#snd_'+name);
			if (elem.length > 0){
				var player = elem[0].player || elem[0];
				var media = player.media || elem[0];
				// console.log('player:', player);
				// console.log('media:', media);
				try{
					player.play();
				}catch(ex){
					alert(ex);
				}
			}
		},
		markTargetLocations: function () {
			if (mSelectedPiece == null)
			    return;
			var type = boardset.indices[mSelectedPiece.idx % boardset.indices.length];
			var limit = boardset.limits[type];
			var mode = limit.mode;
			var poses = null, area = null;
			if (mode == 0)
			    area = { x1: 0, x2: 8, y1: 0, y2: 9 };
			else if (mode == 1)
			    poses = limit.pos;
			else if (mode == 2)
			    area = limit.area;
			else if (mode == 3) {
			    poses = limit.pos;
			    area = limit.area;
			}
			var dirNormaled = (mBlackThenRed && mSelectedPiece.side == -1) || (!mBlackThenRed && mSelectedPiece.side == 1);
			if (poses != null) {
			    for (var i = 0; i < poses.length; ++i) {
			        var y = (dirNormaled ? poses[i].y : (9 - poses[i].y));
			        var x = mBlackThenRed ? poses[i].x : (8 - poses[i].x);
			        var pi = this.getPieceOnLocation(x, y);
			        if (pi < 0 || (mPieces[pi].side != mSelectedPiece.side && mPieces[pi].type != 0)) {
			            mMarkingLocations.push({ x: x, y: y, t: 1 });
			        }
			    }
			}
			if (area != null) {
				for (var i = area.x1; i <= area.x2; ++i) {
					var y1 = (dirNormaled ? area.y1 : (9 - area.y2));
					var y2 = (dirNormaled ? area.y2 : (9 - area.y1));
					for (var j = y1; j <= y2; ++j) {
						var pi = this.getPieceOnLocation(i, j);
					    if (pi < 0 || (mPieces[pi].side != mSelectedPiece.side && mPieces[pi].type != 0)){
					        mMarkingLocations.push({ x: i, y: j, t: 1 });
					    }
					}
				}
			}
		},
		reverseSituation: function(redUp){
			var situ = this.getSituation();
			mBlackThenRed = !redUp;
			// alert(mBlackThenRed);
			this.setSituation(situ);
		},
		getSituation: function() {
		    var info = "";
		    var dir = mBlackThenRed ? 1 : -1;
		    var y = mBlackThenRed ? 0 : 9;
		    while (y >= 0 && y < 10) {
		        var line = "", space = 0;
		    	var x = mBlackThenRed ? 0 : 8;
		        while (x >= 0 && x < 9) {
		            var i = this.getPieceOnLocation(x, y);
		            if (i < 0)
		                ++space;
		            else {
		                if (space > 0)
		                    line += space.toString();
		                var p = mPieces[i];
		                var sign = boardset.limits[p.type].sign;
		                if (p.side > 0)
		                    sign = sign.toUpperCase();
		                line += sign;
		                space = 0;
		            }
		            x += dir;
		        }
	            if (space > 0)
		            line += space.toString();
	            if (info.length > 0)
		            info += "/";
		        info += line;
		        y += dir;
		    }
		    return info;
		},
		setSituation: function(info, toRecord){
			var lines = info.split('/');
			if (lines.length != 10){
				alert('棋局信息格式错误！');
				return;
			}
			for (var i = 0; i < mPieces.length; i++) {
				var p = mPieces[i];
				p.state = 0;
				p.loc = {x: 0, y: 0};
			}
			var map1 = [], map2 = [];
			var idxes = boardset.indices;
			for (var i = 0; i < idxes.length; i++) {
				map1.push(-1 * idxes[i]);
				map2.push(-1 * idxes[i]);
			};
			for (var y = 0; y < lines.length; y++) {
				var line = lines[y];
				var i = 0, x = 0;
				while (x < 9 && i < line.length){
					var c = line.charAt(i);
					if (!isNaN(c))
						x += Number(c);
					else{
						var type = -1, side = 0;
						for (var k = 0; k < boardset.limits.length; k++) {
							var lm = boardset.limits[k];
							if (lm.sign == c.toLowerCase()){
								type = k;
								side = (lm.sign == c ? -1 : 1);
								break;
							}
						};
						if (side < 0){
							for (var k = 0; k < map1.length; k++) {
								if (map1[k] <= 0 && map1[k] == -1 * type){
									var p = mPieces[k];
									p.loc = {
										x: mBlackThenRed ? x : (8 - x), 
										y: mBlackThenRed ? y : (9 - y)
									};
									p.state = 1;
									p.rate = 1;
									p.from = null;
									map1[k] = type;
									break;
								}
							};
						}else if (side > 0){
							for (var k = 0; k < map2.length; k++) {
								if (map2[k] <= 0 && map2[k] == -1 * type){
									var p = mPieces[idxes.length + k];
									p.loc = {
										x: mBlackThenRed ? x : (8 - x), 
										y: mBlackThenRed ? y : (9 - y)
									};
									p.state = 1;
									p.rate = 1;
									p.from = null;
									map2[k] = type;
									break;
								}
							};
						}
						++x;
					}
					++i;
				}
			};
			this.draw();
			toRecord && this.pushSituation();
			env.evts.onBoardChanged();
		},
		resetSituation: function () {
			var me = this;
			var count = mPieces.length / 2;
			var locs = new Array(mPieces.length);
			var def_locs = boardset.def_locations;
			var states = new Array(mPieces.length);
			for (var i = 0; i < mPieces.length; ++i) {
				var p = mPieces[i];
				if (p.side > 0 && mBlackThenRed) {
					p.loc.x = 8 - def_locs[i % count].x;
					p.loc.y = 9 - def_locs[i % count].y;
				}
				else {
					p.loc.x = def_locs[i % count].x;
					p.loc.y = def_locs[i % count].y;
				}
				p.rate = 1;
				p.from = null;
				p.state = 1;

				states[i] = 1;
				locs[i] = p.loc;
			}
			this.saveSituation();
		},
		saveSituation: function(){
			mSituation = this.getSituation();
		},
		restoreSituation: function(){
			this.clearMarks();
			if (mSituation && mSituation.length)
				this.setSituation(mSituation);
		},
		pushSituation: function(){
			if (mBatchMoveFunc)
				return;// donot push while animating
			var info = this.getSituation();
			var idxNext = mSituationIndex + 1;
			if (idxNext < mSituationQueue.length){
				mSituationQueue.splice(idxNext, mSituationQueue.length - idxNext);
			}
			mSituationQueue.push(info);
			mSituationIndex = mSituationQueue.length - 1;
		},
		undoSituation: function(){
			var idxPrev = mSituationIndex - 1;
			if (idxPrev >= 0){
				mSituationIndex = idxPrev;
				this.setSituation(mSituationQueue[idxPrev]);
				this.clearMarks();
			}
		},
		redoSituation: function(){
			var idxNext = mSituationIndex + 1;
			if (idxNext < mSituationQueue.length){
				mSituationIndex = idxNext;
				this.setSituation(mSituationQueue[idxNext]);
				this.clearMarks();
			}
		},
		clearSituationQueue: function(){
			mSituationQueue.length = 0;
			mSituationIndex = -1;
			this.pushSituation();
		},
		tiggerNextMove: function(){
			if (++mBatchMoveIndex < mBatchMoves.length){
				this.setCurrMove(mBatchMoves[mBatchMoveIndex], true);
			}else{
				clearInterval(mBatchMoveFunc);
				mBatchMoveFunc = null;
			}
		},
		setCurrMoves: function(movestr){
			if (!movestr || movestr.length == 0)
				return;
			if (mLastBatchMoveStr.length > 0 && movestr == mLastBatchMoveStr)
				return;
			mLastBatchMoveStr = movestr;
			mBatchMoves = movestr.split(' ');
			mBatchMoveIndex = -1;
			this.restoreSituation();
			mBatchMoveFunc && clearInterval(mBatchMoveFunc);
			mBatchMoveFunc = setInterval(function(){
				board.tiggerNextMove();
			}, 80);
		},
		setCurrMove: function (move, moveit, finalmove) {
			if (finalmove){
				mBatchMoveFunc && clearInterval(mBatchMoveFunc);
				mBatchMoveFunc = null;
				mLastBatchMoveStr = '';
				this.restoreSituation();
			}
			var x1 = Math.floor(move.charCodeAt(0) - 'a'.charCodeAt(0));
			var y1 = Math.floor(move[1]);
			var x2 = Math.floor(move.charCodeAt(2) - 'a'.charCodeAt(0));
			var y2 = Math.floor(move[3]);
			if (mBlackThenRed){
				y1 = 9 - y1;
				y2 = 9 - y2;
			}else{
				x1 = 8 - x1;
				x2 = 8 - x2;
			}
			var eatit = false;
			if (moveit){
				var i1 = this.getPieceOnLocation(x1, y1);
				var i2 = this.getPieceOnLocation(x2, y2);
				if (i2 >= 0){
					eatit = true;
			    	var p = mPieces[i2];
					p.state = 0;
				}
				if (i1 >= 0){
				    var p = mPieces[i1];
					p.from = {x: p.loc.x, y: p.loc.y};
					p.rate = 0;
					p.loc = {x: x2, y: y2};
				    p.state = 1;
				}
				this.pushSituation();
			}
			if (finalmove){
				if (eatit)
					this.playSound('eat');
				else
					this.playSound('move2');
			}

			mMarkingLocations.length = 0;
			mMarkingLocations[0] = { x: x1, y: y1, t: 0 };
			mMarkingLocations[1] = { x: x2, y: y2, t: 0 };
			this.draw();
		}
	}
})();