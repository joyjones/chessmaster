using System;
using System.Collections.Generic;
using System.Linq;
using System.ServiceModel;
using System.Text;
using System.Threading.Tasks;
using ChessCommon;

namespace ChessMaster
{
    [ServiceBehavior(ConcurrencyMode = ConcurrencyMode.Single)]
    public class MainService : IChessService
    {
        #region IChessService 成员
        public void Connect(LoginInfo info)
        {
            IEngineService terminal = OperationContext.Current.GetCallbackChannel<IEngineService>();

        }
        public void Disconnect(LoginInfo info)
        {
        }
        public void OnResult(string result)
        {
        }
        #endregion
    }
}
