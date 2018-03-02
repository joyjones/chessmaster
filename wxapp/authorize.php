<?php

define("WX_APPID", "wxd0896b8367d3917d");
define("WX_APPSECRET", "65dad3a425304190c95da483be9c9761");

class Authorizer
{
	protected $serverUrl = 'http://103.43.187.148/';

	public function authorize()
	{
		$code = $_REQUEST['code'];
		if (!isset($code))
			return;
		$state = $_REQUEST['state'];
		$fromurl = $_REQUEST['fromurl'];

		$this->log('authorize', 'begin authorize using code:'.$code);

		$fullauth = true;
		$errmsg = '';
		$rst = $this->requireAccessToken('authorization_code', "code=$code");
		if (!$rst){
			$errmsg = "FAILED WX REGISTERATION:code=$code|furl=$fromurl|state=$state";
		}
		else if ($rst->openid == null || !strlen($rst->openid)){
			$errmsg = "ERROR WX REGISTERATION:code=$code|furl=$fromurl|state=$state\r\n".print_r($rst, true);
		}
		else{
			$uid = $this->requireUserInfo($fullauth, $rst->access_token, $rst->openid, $errmsg);
			if ($uid > 0){
				$ln = '?';
				$n = strpos($fromurl, '|');
				if ($n === 0 || $n > 0){
					$ln = '&';
					$fromurl = preg_replace("/\|/", '&', $fromurl);
					$fromurl = preg_replace("/[\?&]openid=/", '', $fromurl);
					$n = strpos($fromurl, '&');
					$fromurl = substr($fromurl, 0, $n).'?'.substr($fromurl, $n + 1);
				}
				$_SESSION["chessmaster_uinfo_v6"] = array('uid' => $uid, 'time' => time());

				$url = "http://$fromurl$ln";
				$this->log('authorize', "finish url: $url(code=$code;fullauth=$fullauth;fromurl=$fromurl;state=$state;uid=$uid)");
				Header("Location: $url");
				exit;
			}
		}
		echo $errmsg;
		$this->log('authorize', 'error: '.$errmsg);
	}

	protected function requireAccessToken($grant_type = 'client_credential', $moreargs = '')
	{
		if ($grant_type === 'client_credential')
			$url = 'https://api.weixin.qq.com/cgi-bin/token';
		else if ($grant_type === 'authorization_code')
			$url = "https://api.weixin.qq.com/sns/oauth2/access_token";
		else
			return null;
		$url .= "?grant_type=$grant_type";
		$url .= "&appid=".WX_APPID;
		$url .= "&secret=".WX_APPSECRET;
		if (strlen($moreargs))
			$url .= "&$moreargs";
		$rst = $this->executeUrl($url);
		return $rst;
	}

	protected function requireUserInfo($fullauth, $access_token, $openid, &$errmsg)
	{
		$uid = -1;
		if ($fullauth){
	        $url = "https://api.weixin.qq.com/sns/userinfo";
	        $url .= "?access_token=$access_token";
	        $url .= "&openid=$openid";
	        $url .= "&lang=zh_CN";
	    	$info = $this->executeUrl($url);
	    	if ($info && $info->openid){
				$this->log('authorize', 'visiting register webserver...');
	    		$url = $this->serverUrl.'Player/Register';
	    		$url .= "?openid=$info->openid";
	    		$url .= "&nickname=".urlencode($info->nickname);
	    		$url .= "&province=".urlencode($info->province);
	    		$url .= "&city=".urlencode($info->city);
	    		$url .= "&country=".urlencode($info->country);
	    		$url .= "&headimgurl=".urlencode($info->headimgurl);
	    		$url .= "&privilege=".urlencode($info->privilege);
				$this->log('authorize', 'register url: '.$url.print_r($r));
				$r = $this->executeUrl($url);
				if ($r)
					$this->log('authorize', 'register result: '.print_r($r));
				if ($r && $r->success)
					$uid = $r->uid;
				else
					$errmsg = 'web-server registration failed!';
			}else{
				$errmsg = print_r($info, true);
			}
		}else{
			$this->log('authorize', 'visiting asp register server...');
    		$url = $this->serverUrl."Player/Register?fullauth=0&openid=$info->openid";
			$r = $this->executeUrl($url);
			if ($r && $r->success)
				$uid = $r->uid;
			else
				$errmsg = 'asp-server link or register failed';
		}
		return $uid;
	}

	public function getTime()
	{
		return date('Y-m-d H:i:s',time());
	}

	public function getDate()
	{
		return date('Y-m-d',time());
	}

	public function log($key, $msg)
	{
		$time = date('Y-m-d H:i:s',time());
		file_put_contents("logs/$key.log", "[$time] $msg\r\n", FILE_APPEND);
	}

	protected function executeUrl($url, $ispost = false)
	{
        $curl = curl_init();
        curl_setopt($curl, CURLOPT_URL, $url);
        curl_setopt($curl, CURLOPT_POST, false);
        curl_setopt($curl, CURLOPT_RETURNTRANSFER, 1);
        curl_setopt($curl, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($curl, CURLOPT_SSL_VERIFYHOST, false);
        $rst = curl_exec($curl);
        $_e = curl_error($curl);
        if ($rst)
			$this->log('authorize', '  --curl_exec return: '.print_r($rst));
		else
			$this->log('authorize', '  --curl_exec return: null');
        if ($_e)
			$this->log('authorize', '  --curl_error: '.print_r($_e));
		else
			$this->log('authorize', '  --curl_error: null');

        if ($rst)
            $rst = json_decode($rst);
        curl_close($curl);
        return $rst;
	}
}

$author = new Authorizer;
session_start();
if (isset($_GET['require']) && $_GET['require']){
	$uinfo = $_SESSION["chessmaster_uinfo_v6"];
	if (!$uinfo){
		echo "0";
		$author->log('authorize', "required uid: null");
	}
	else {
		$secs = time() - $uinfo['time'];
		if ($secs > 24 * 3600){
			echo "0";
			$author->log('authorize', "session time($secs) repired.");
		}
		else{
			echo $uinfo['uid'];
			$author->log('authorize', "required uid: ".$uinfo['uid']);
		}
	}
}else{
	$author->authorize();
}

?>