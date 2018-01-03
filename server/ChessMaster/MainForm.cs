using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data;
using System.Drawing;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Windows.Forms;
using ChessCommon;

namespace ChessMaster
{
    public partial class MainForm : Form
    {
        public MainForm()
        {
            InitializeComponent();
        }

        private void MainForm_Load(object sender, EventArgs e)
        {
            var host1 = new ServiceHostProxy("主服务");
            host1.OnErrorMessage += PushMessage;
            host1.OnMessage += PushMessage;
            Program.OnStartupService(host1);
        }

        public void PushMessage(string msg)
        {
        }
    }
}
