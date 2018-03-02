<?php

class Log_
{
	// 打印log
	function  log_result($name, $word) 
	{
	    $fp = fopen("../logs/$name.log", "a");
	    flock($fp, LOCK_EX) ;
	    fwrite($fp,"执行日期：".strftime("%Y-%m-%d-%H:%M:%S",time())."\n".$word."\n\n");
	    flock($fp, LOCK_UN);
	    fclose($fp);
	}
}

?>