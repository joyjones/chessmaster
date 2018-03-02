<?php
// http://localhost.uhoo365.cn/weixin/entry/lefeng/milkcow/svr/wxentry.php
class wxEntry {
  private $appId;
  private $appSecret;

  public function __construct($appId="wxd0896b8367d3917d", $appSecret="65dad3a425304190c95da483be9c9761") {
    $this->appId = $appId;
    $this->appSecret = $appSecret;
  }

  public function getSignPackage($url) {
    $jsapiTicket = $this->getJsApiTicket();
    if (!$url || !strlen($url))
      $url = "http://$_SERVER[HTTP_HOST]$_SERVER[REQUEST_URI]";
    $timestamp = time();
    $nonceStr = $this->createNonceStr();

    // 这里参数的顺序要按照 key 值 ASCII 码升序排序
    $string = "jsapi_ticket=$jsapiTicket&noncestr=$nonceStr&timestamp=$timestamp&url=$url";

    $signature = sha1($string);

    $signPackage = array(
      "appId"     => $this->appId,
      "nonceStr"  => $nonceStr,
      "timestamp" => $timestamp,
      "url"       => $url,
      "signature" => $signature,
      "rawString" => $string
    );
    return $signPackage; 
  }

  private function createNonceStr($length = 16) {
    $chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    $str = "";
    for ($i = 0; $i < $length; $i++) {
      $str .= substr($chars, mt_rand(0, strlen($chars) - 1), 1);
    }
    return $str;
  }

  private function getJsApiTicket() {
    $time = date('Y-m-d H:i:s',time());
    $logfile = 'logs/jsapi_ticket-'.date('Y-m-d',time()).'.log';

    // jsapi_ticket 应该全局存储与更新，以下代码以写入到文件中做示例
    $ctx = file_get_contents("logs/jsapi_ticket.json");
    $data = json_decode($ctx);
    if (!$data || strlen($ctx) == 0){
      $data = json_decode(json_encode(array('expire_time' => 1, 'jsapi_ticket' => 0)));
      file_put_contents($logfile, 'create new:'.json_encode($data)."\r\n", FILE_APPEND);
    }
    if ($data->expire_time < time()) {
      file_put_contents($logfile, "expired\r\n", FILE_APPEND);
      $accessToken = $this->getAccessToken();
      $url = "https://api.weixin.qq.com/cgi-bin/ticket/getticket?type=jsapi&access_token=$accessToken";
      $res = json_decode($this->httpGet($url));
      $ticket = $res->ticket;

      if ($ticket) {
        $data->expire_time = time() + 7000;
        $data->jsapi_ticket = $ticket;
        file_put_contents("logs/jsapi_ticket.json", json_encode($data));
        file_put_contents($logfile, "== required new ticket, expired time: $data->expire_time\r\n", FILE_APPEND);
      }else{
        file_put_contents($logfile, "== failed requireing ticket: $res->errcode\r\n", FILE_APPEND);
      }
    } else {
      $ticket = $data->jsapi_ticket;
    }

    file_put_contents($logfile, "[$time] ticket: $ticket\r\n", FILE_APPEND);
    return $ticket;
  }

  private function getAccessToken() {
    $time = date('Y-m-d H:i:s',time());
    $logfile = 'logs/jsapi_ticket-'.date('Y-m-d',time()).'.log';
    // access_token 应该全局存储与更新，以下代码以写入到文件中做示例
    $data = json_decode(file_get_contents("logs/access_token.json"));
    if ($data->expire_time < time()) {
      $url = "https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=$this->appId&secret=$this->appSecret";
      $res = json_decode($this->httpGet($url));
      $access_token = $res->access_token;

      if ($access_token) {
        $data->expire_time = time() + 7000;
        $data->access_token = $access_token;
        file_put_contents("logs/access_token.json", json_encode($data));
        file_put_contents($logfile, "== required new access_token, expired time: $data->expire_time\r\n", FILE_APPEND);
      }
    } else {
      $access_token = $data->access_token;
    }

    file_put_contents($logfile, "[$time] access_token: $access_token\r\n", FILE_APPEND);
    return $access_token;
  }

  private function httpGet($url) {
    $curl = curl_init();
    curl_setopt($curl, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($curl, CURLOPT_TIMEOUT, 500);
    curl_setopt($curl, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($curl, CURLOPT_SSL_VERIFYHOST, false);
    curl_setopt($curl, CURLOPT_URL, $url);

    $res = curl_exec($curl);
    curl_close($curl);

    return $res;
  }
}

$entry = new wxEntry();

if (isset($_SERVER['HTTP_REFERER']))
  $url = $_SERVER['HTTP_REFERER'];
else
  $url = $_SERVER["REQUEST_URI"];

$data = $entry->GetSignPackage($url);
echo json_encode($data);

