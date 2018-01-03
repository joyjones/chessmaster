using System;
using System.Collections.Generic;
using System.Linq;
using System.Runtime.Serialization;
using System.ServiceModel;
using System.Text;
using System.Threading.Tasks;

namespace ChessCommon
{
    [ServiceContract(Namespace = "http://Chess.Common.Services", CallbackContract = typeof(IEngineService))]
    public interface IChessService
    {
        [OperationContract(IsOneWay = true)]
        void Connect(LoginInfo info);
        [OperationContract(IsOneWay = true)]
        void Disconnect(LoginInfo info);
        [OperationContract(IsOneWay = true)]
        void OnResult(string result);
    }

    public interface IEngineService
    {
        [OperationContract(IsOneWay = true)]
        void NotifyLoginResult();
        [OperationContract(IsOneWay = true)]
        void OnCommand(string command);
    }

    [DataContract]
    public class LoginInfo
    {
        public LoginInfo()
        {
        }
        public LoginInfo(Guid guid)
        {
            GUID = guid;
        }
        [DataMember]
        public Guid GUID = Guid.Empty;

    }
}
