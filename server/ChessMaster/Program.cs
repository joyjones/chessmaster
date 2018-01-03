using System;
using System.Collections.Generic;
using System.Linq;
using System.ServiceModel;
using System.Threading;
using System.Threading.Tasks;
using System.Windows.Forms;
using ChessCommon;

namespace ChessMaster
{
    static class Program
    {
        /// <summary>
        /// 应用程序的主入口点。
        /// </summary>
        [STAThread]
        static void Main()
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            Application.Run(new MainForm());
            ServiceProxy.StopService();
            IsAppRunning = false;
        }
        private static ServiceHostProxy ServiceProxy = null;
        private static bool IsAppRunning = true;
        public static void OnStartupService(ServiceHostProxy host)
        {
            // 启动登录连接服务线程
            ThreadPool.QueueUserWorkItem(new WaitCallback(obj =>
            {
                while (IsAppRunning)
                {
                    var binding = new NetTcpBinding(SecurityMode.None);
                    binding.Security.Transport.ClientCredentialType = TcpClientCredentialType.Windows;
                    binding.Security.Transport.ProtectionLevel = System.Net.Security.ProtectionLevel.EncryptAndSign;
                    binding.OpenTimeout = TimeSpan.MaxValue;
                    binding.SendTimeout = TimeSpan.MaxValue;
                    binding.ReceiveTimeout = TimeSpan.MaxValue;
                    binding.MaxReceivedMessageSize = 1024 * 1024;
                    binding.MaxBufferPoolSize = 1024 * 1024;
                    if (!host.StartService(typeof(MainService), typeof(IChessService), binding, 8601, "MainService"))
                    {
                        Thread.Sleep(1000);
                        continue;
                    }
                    ServiceProxy = host;
                    break;
                }
            }));
        }
    }
}
