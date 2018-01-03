using System;
using System.Collections.Generic;
using System.Linq;
using System.ServiceModel;
using System.Text;
using System.Threading.Tasks;
using ChessCommon;

namespace ChessEngineer
{
    [ServiceBehavior(ConcurrencyMode = ConcurrencyMode.Single)]
    public class EngineService : IEngineService
    {
        #region IEngineService 成员
        public void NotifyLoginResult()
        {
        }
        public void OnCommand(string command)
        {
        }
        #endregion
    }
}
