using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.ServiceModel;
using System.ServiceModel.Description;
using System.Text;
using System.Threading.Tasks;

namespace ChessCommon
{
    public class ServiceHostProxy
    {
        public static IPAddress IPAddress
        {
            get
            {
                IPHostEntry ips = Dns.GetHostEntry(Dns.GetHostName());
                IPAddress _ipAddress = (from adr in ips.AddressList
                                        where !adr.IsIPv6LinkLocal
                                        select adr).FirstOrDefault();
                return _ipAddress;
            }
        }
        public ServiceHostProxy()
        {
        }
        public ServiceHostProxy(string _name)
        {
            name = _name;
        }
        private string name = "";
        private ServiceHost host;
        public delegate void Delegate_OnErrorMessage(string msg);
        public delegate void Delegate_OnMessage(string msg);
        public event Delegate_OnMessage OnMessage;
        public event Delegate_OnErrorMessage OnErrorMessage;
        public string LogName { get { return name + "服务"; } }
        public bool StartService(Type serviceType, Type contractType, System.ServiceModel.Channels.Binding binding, int port, string addr)
        {
            try
            {
                var baseAddr = new Uri(String.Format("{0}://localhost:{1}/{2}", binding.Scheme, port, addr));
                host = new ServiceHost(serviceType, baseAddr);
                host.Opened += new EventHandler(OnHost_Opened);
                host.Faulted += new EventHandler(OnHost_Faulted);
                host.UnknownMessageReceived += new EventHandler<UnknownMessageReceivedEventArgs>(OnHost_UnknownMessageReceived);
                var endpoint = host.AddServiceEndpoint(contractType, binding, String.Empty);

                var throttle = host.Description.Behaviors.Find<ServiceThrottlingBehavior>();
                if (throttle == null)
                {
                    throttle = new ServiceThrottlingBehavior();
                    throttle.MaxConcurrentCalls = 100;
                    throttle.MaxConcurrentSessions = 100;
                    host.Description.Behaviors.Add(throttle);
                }
                host.Open();
                return true;
            }
            catch (System.Exception ex)
            {
                if (OnErrorMessage != null)
                    OnErrorMessage(String.Format("启动{0}失败！{1}", LogName, ex.Message));
                return false;
            }
        }

        void OnHost_UnknownMessageReceived(object sender, UnknownMessageReceivedEventArgs e)
        {
        }

        void OnHost_Faulted(object sender, EventArgs e)
        {
            if (OnErrorMessage != null)
                OnErrorMessage(LogName + "服务发生异常！");
        }

        void OnHost_Opened(object sender, EventArgs e)
        {
            if (OnMessage != null)
                OnMessage(String.Format("启动{0}成功！", LogName));
        }

        public void StopService()
        {
            if (host != null)
                host.Close();
        }
    }
}
