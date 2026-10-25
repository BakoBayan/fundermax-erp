using System;
using System.IO;
using System.Net;
using System.Net.NetworkInformation;
using System.Net.Sockets;
using System.Diagnostics;
using System.Drawing;
using System.Windows.Forms;
using System.Threading;
using System.Collections.Generic;

namespace BakosPanelClient
{
    static class Program
    {
        public static string AppVersion = "v1.3 Client";

        [STAThread]
        static void Main(string[] args)
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);

            string serverUrl = LoadServerUrl(args);

            bool forceConfig = args != null && args.Length > 0 &&
                (args[0] == "--config" || args[0] == "--setup" || args[0] == "-s" || args[0] == "/config");

            // Fast check: If server is immediately reachable, launch app without showing config dialog
            if (!forceConfig && TestServerConnection(serverUrl, 2000))
            {
                LaunchBrowserApp(serverUrl);
                return;
            }

            // Otherwise, open the connection manager dialog
            Application.Run(new ConnectionForm(serverUrl));
        }

        public static string GetConfigFilePath()
        {
            string localDir = AppDomain.CurrentDomain.BaseDirectory;
            string localFile = Path.Combine(localDir, "server_config.ini");
            try
            {
                // Test if directory is writable
                if (!File.Exists(localFile))
                {
                    File.WriteAllText(localFile, "# Bako's Panel Manager Server Address\r\nSERVER_URL=http://192.168.1.33:3000\r\n");
                }
                return localFile;
            }
            catch
            {
                // Fallback to APPDATA if running from write-protected location
                string appData = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "BakosPanelClient");
                if (!Directory.Exists(appData)) Directory.CreateDirectory(appData);
                return Path.Combine(appData, "server_config.ini");
            }
        }

        public static string LoadServerUrl(string[] args)
        {
            if (args != null && args.Length > 0 && args[0].StartsWith("http", StringComparison.OrdinalIgnoreCase))
            {
                return NormalizeUrl(args[0]);
            }

            try
            {
                string path = GetConfigFilePath();
                if (File.Exists(path))
                {
                    string[] lines = File.ReadAllLines(path);
                    foreach (var line in lines)
                    {
                        string trimmed = line.Trim();
                        if (trimmed.StartsWith("SERVER_URL=", StringComparison.OrdinalIgnoreCase))
                        {
                            string url = trimmed.Substring("SERVER_URL=".Length).Trim();
                            if (!string.IsNullOrEmpty(url)) return NormalizeUrl(url);
                        }
                        else if (trimmed.StartsWith("http://", StringComparison.OrdinalIgnoreCase) || trimmed.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
                        {
                            return NormalizeUrl(trimmed);
                        }
                    }
                }
            }
            catch {}

            return "http://192.168.1.33:3000";
        }

        public static void SaveServerUrl(string url)
        {
            try
            {
                string path = GetConfigFilePath();
                File.WriteAllText(path, "# Bako's Panel Manager - Central Server Address\r\nSERVER_URL=" + NormalizeUrl(url) + "\r\n");
            }
            catch {}
        }

        public static string NormalizeUrl(string input)
        {
            if (string.IsNullOrEmpty(input)) return "http://192.168.1.33:3000";
            string clean = input.Trim().TrimEnd('/');
            if (!clean.StartsWith("http://", StringComparison.OrdinalIgnoreCase) &&
                !clean.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
            {
                clean = "http://" + clean;
            }
            // If port is not specified, append default port :3000 unless port 80/443
            Uri uri;
            if (Uri.TryCreate(clean, UriKind.Absolute, out uri))
            {
                if (uri.Port == 80 && !clean.EndsWith(":80"))
                {
                    clean = clean + ":3000";
                }
            }
            return clean;
        }

        public static bool TestServerConnection(string url, int timeoutMs = 2500)
        {
            try
            {
                string clean = NormalizeUrl(url);
                string testUrl = clean + "/api/network-info";
                HttpWebRequest req = (HttpWebRequest)WebRequest.Create(testUrl);
                req.Method = "GET";
                req.Timeout = timeoutMs;
                req.ReadWriteTimeout = timeoutMs;
                using (HttpWebResponse resp = (HttpWebResponse)req.GetResponse())
                {
                    return resp.StatusCode == HttpStatusCode.OK;
                }
            }
            catch
            {
                try
                {
                    string rootUrl = NormalizeUrl(url);
                    HttpWebRequest req = (HttpWebRequest)WebRequest.Create(rootUrl);
                    req.Method = "GET";
                    req.Timeout = timeoutMs;
                    using (HttpWebResponse resp = (HttpWebResponse)req.GetResponse())
                    {
                        return resp.StatusCode == HttpStatusCode.OK;
                    }
                }
                catch
                {
                    return false;
                }
            }
        }

        public static void LaunchBrowserApp(string serverUrl)
        {
            string browser = FindBrowser();
            string dataDir = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                "BakosPanelClient"
            );

            if (!string.IsNullOrEmpty(browser))
            {
                ProcessStartInfo psi = new ProcessStartInfo
                {
                    FileName = browser,
                    Arguments = "--app=\"" + serverUrl + "\" --user-data-dir=\"" + dataDir + "\" --window-size=1360,860",
                    UseShellExecute = true
                };
                Process.Start(psi);
            }
            else
            {
                Process.Start(serverUrl);
            }
        }

        public static string FindBrowser()
        {
            string[] paths = new string[]
            {
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), @"Microsoft\Edge\Application\msedge.exe"),
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), @"Microsoft\Edge\Application\msedge.exe"),
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), @"Google\Chrome\Application\chrome.exe"),
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), @"Google\Chrome\Application\chrome.exe")
            };

            foreach (var p in paths)
            {
                if (File.Exists(p)) return p;
            }
            return null;
        }
    }

    public class ConnectionForm : Form
    {
        private TextBox txtServerUrl;
        private Label lblStatus;
        private Button btnConnect;
        private Button btnScan;
        private Button btnHelp;
        private ProgressBar progressBar;
        private bool isScanning = false;

        public ConnectionForm(string initialUrl)
        {
            InitializeComponent(initialUrl);
        }

        private void InitializeComponent(string initialUrl)
        {
            this.Text = "Bako's Panel Manager — Workstation Client";
            this.Size = new Size(540, 420);
            this.StartPosition = FormStartPosition.CenterScreen;
            this.FormBorderStyle = FormBorderStyle.FixedDialog;
            this.MaximizeBox = false;
            this.MinimizeBox = true;
            this.BackColor = Color.FromArgb(248, 250, 252);
            this.Font = new Font("Segoe UI", 9.5f, FontStyle.Regular);

            // Try load icon from exe or directory
            try
            {
                string iconPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "server_icon.ico");
                if (File.Exists(iconPath))
                {
                    this.Icon = new Icon(iconPath);
                }
                else
                {
                    this.Icon = Icon.ExtractAssociatedIcon(Application.ExecutablePath);
                }
            }
            catch {}

            // Header Banner
            Panel headerPanel = new Panel();
            headerPanel.Dock = DockStyle.Top;
            headerPanel.Height = 85;
            headerPanel.BackColor = Color.FromArgb(4, 120, 87); // Emerald 700

            Label lblAppTitle = new Label();
            lblAppTitle.Text = "Bako's Panel Manager";
            lblAppTitle.ForeColor = Color.White;
            lblAppTitle.Font = new Font("Segoe UI", 16f, FontStyle.Bold);
            lblAppTitle.Location = new Point(20, 16);
            lblAppTitle.AutoSize = true;

            Label lblSubtitle = new Label();
            lblSubtitle.Text = "Client Workstation • Connect to Central Warehouse Server";
            lblSubtitle.ForeColor = Color.FromArgb(209, 250, 229); // Emerald 100
            lblSubtitle.Font = new Font("Segoe UI", 9.5f, FontStyle.Regular);
            lblSubtitle.Location = new Point(22, 48);
            lblSubtitle.AutoSize = true;

            headerPanel.Controls.Add(lblAppTitle);
            headerPanel.Controls.Add(lblSubtitle);
            this.Controls.Add(headerPanel);

            // Main Content Area
            Panel contentPanel = new Panel();
            contentPanel.Location = new Point(20, 100);
            contentPanel.Size = new Size(485, 260);

            // Status Card
            Panel statusCard = new Panel();
            statusCard.Location = new Point(0, 0);
            statusCard.Size = new Size(485, 55);
            statusCard.BackColor = Color.FromArgb(254, 243, 199); // Amber 100
            statusCard.BorderStyle = BorderStyle.FixedSingle;

            lblStatus = new Label();
            lblStatus.Text = "Connecting to warehouse server...";
            lblStatus.ForeColor = Color.FromArgb(146, 64, 14); // Amber 800
            lblStatus.Font = new Font("Segoe UI", 9.5f, FontStyle.Bold);
            lblStatus.Location = new Point(12, 16);
            lblStatus.AutoSize = true;
            statusCard.Controls.Add(lblStatus);
            contentPanel.Controls.Add(statusCard);

            // Server Address Input Group
            Label lblInputHeader = new Label();
            lblInputHeader.Text = "Central Server Address or IP (Port 3000):";
            lblInputHeader.Font = new Font("Segoe UI", 9.5f, FontStyle.Bold);
            lblInputHeader.ForeColor = Color.FromArgb(30, 41, 59);
            lblInputHeader.Location = new Point(0, 70);
            lblInputHeader.AutoSize = true;
            contentPanel.Controls.Add(lblInputHeader);

            txtServerUrl = new TextBox();
            txtServerUrl.Text = initialUrl;
            txtServerUrl.Font = new Font("Segoe UI", 11f, FontStyle.Regular);
            txtServerUrl.Location = new Point(0, 95);
            txtServerUrl.Size = new Size(485, 28);
            txtServerUrl.KeyDown += (s, e) => { if (e.KeyCode == Keys.Enter) DoConnect(); };
            contentPanel.Controls.Add(txtServerUrl);

            Label lblHint = new Label();
            lblHint.Text = "Example: http://192.168.1.33:3000 (shown in the main server window)";
            lblHint.Font = new Font("Segoe UI", 8.5f, FontStyle.Italic);
            lblHint.ForeColor = Color.FromArgb(100, 116, 139);
            lblHint.Location = new Point(0, 128);
            lblHint.AutoSize = true;
            contentPanel.Controls.Add(lblHint);

            // Progress Bar for Auto-Scan
            progressBar = new ProgressBar();
            progressBar.Location = new Point(0, 155);
            progressBar.Size = new Size(485, 12);
            progressBar.Visible = false;
            contentPanel.Controls.Add(progressBar);

            // Buttons
            btnConnect = new Button();
            btnConnect.Text = "Connect to Server";
            btnConnect.BackColor = Color.FromArgb(4, 120, 87);
            btnConnect.ForeColor = Color.White;
            btnConnect.Font = new Font("Segoe UI", 10.5f, FontStyle.Bold);
            btnConnect.FlatStyle = FlatStyle.Flat;
            btnConnect.FlatAppearance.BorderSize = 0;
            btnConnect.Location = new Point(0, 180);
            btnConnect.Size = new Size(180, 42);
            btnConnect.Cursor = Cursors.Hand;
            btnConnect.Click += (s, e) => DoConnect();
            contentPanel.Controls.Add(btnConnect);

            btnScan = new Button();
            btnScan.Text = "Auto-Detect Server";
            btnScan.BackColor = Color.FromArgb(226, 232, 240);
            btnScan.ForeColor = Color.FromArgb(30, 41, 59);
            btnScan.Font = new Font("Segoe UI", 9.5f, FontStyle.Bold);
            btnScan.FlatStyle = FlatStyle.Flat;
            btnScan.FlatAppearance.BorderSize = 0;
            btnScan.Location = new Point(190, 180);
            btnScan.Size = new Size(160, 42);
            btnScan.Cursor = Cursors.Hand;
            btnScan.Click += (s, e) => DoAutoScan();
            contentPanel.Controls.Add(btnScan);

            btnHelp = new Button();
            btnHelp.Text = "Instructions";
            btnHelp.BackColor = Color.FromArgb(241, 245, 249);
            btnHelp.ForeColor = Color.FromArgb(71, 85, 105);
            btnHelp.Font = new Font("Segoe UI", 9.5f, FontStyle.Regular);
            btnHelp.FlatStyle = FlatStyle.Flat;
            btnHelp.FlatAppearance.BorderSize = 0;
            btnHelp.Location = new Point(360, 180);
            btnHelp.Size = new Size(125, 42);
            btnHelp.Cursor = Cursors.Hand;
            btnHelp.Click += (s, e) => ShowHelp();
            contentPanel.Controls.Add(btnHelp);

            this.Controls.Add(contentPanel);

            // Auto-check on load
            this.Shown += (s, e) =>
            {
                ThreadPool.QueueUserWorkItem((_) =>
                {
                    bool ok = Program.TestServerConnection(txtServerUrl.Text, 2000);
                    this.Invoke((MethodInvoker)delegate
                    {
                        if (ok)
                        {
                            lblStatus.Text = "Server online! Click Connect to launch.";
                            statusCard.BackColor = Color.FromArgb(209, 250, 229); // Emerald 100
                            lblStatus.ForeColor = Color.FromArgb(6, 95, 70); // Emerald 800
                        }
                        else
                        {
                            lblStatus.Text = "Cannot reach server. Verify address or click Auto-Detect.";
                            statusCard.BackColor = Color.FromArgb(254, 226, 226); // Rose 100
                            lblStatus.ForeColor = Color.FromArgb(153, 27, 27); // Rose 800
                        }
                    });
                });
            };
        }

        private void DoConnect()
        {
            string url = Program.NormalizeUrl(txtServerUrl.Text);
            txtServerUrl.Text = url;
            btnConnect.Enabled = false;
            btnConnect.Text = "Connecting...";

            ThreadPool.QueueUserWorkItem((_) =>
            {
                bool reachable = Program.TestServerConnection(url, 3000);
                this.Invoke((MethodInvoker)delegate
                {
                    btnConnect.Enabled = true;
                    btnConnect.Text = "Connect to Server";

                    if (reachable)
                    {
                        Program.SaveServerUrl(url);
                        Program.LaunchBrowserApp(url);
                        this.Close();
                    }
                    else
                    {
                        MessageBox.Show(
                            "Could not connect to Bako's Panel Server at:\n\n" + url + "\n\n" +
                            "Checklist:\n" +
                            "1. Make sure the server computer is turned on with Bako's Panel Server running.\n" +
                            "2. Make sure both computers are connected to the same Wi-Fi.\n" +
                            "3. Check if the server's IP has changed (use Auto-Detect or look at the server screen).",
                            "Server Unreachable",
                            MessageBoxButtons.OK,
                            MessageBoxIcon.Warning
                        );
                    }
                });
            });
        }

        private void DoAutoScan()
        {
            if (isScanning) return;
            isScanning = true;
            btnScan.Enabled = false;
            btnConnect.Enabled = false;
            progressBar.Visible = true;
            progressBar.Value = 0;
            lblStatus.Text = "Scanning local Wi-Fi network for Bako Server on port 3000...";

            ThreadPool.QueueUserWorkItem((_) =>
            {
                string foundUrl = ScanForServer();
                this.Invoke((MethodInvoker)delegate
                {
                    isScanning = false;
                    btnScan.Enabled = true;
                    btnConnect.Enabled = true;
                    progressBar.Visible = false;

                    if (!string.IsNullOrEmpty(foundUrl))
                    {
                        txtServerUrl.Text = foundUrl;
                        lblStatus.Text = "Found Bako Server at " + foundUrl + "!";
                        MessageBox.Show("Server discovered at " + foundUrl + "!\nClick Connect to open.", "Server Found", MessageBoxButtons.OK, MessageBoxIcon.Information);
                    }
                    else
                    {
                        lblStatus.Text = "Server not found on local subnet. Enter IP manually.";
                        MessageBox.Show("No Bako Server was found on the local network automatically.\nPlease verify the server IP on the main computer and enter it manually.", "Scan Finished", MessageBoxButtons.OK, MessageBoxIcon.Information);
                    }
                });
            });
        }

        private string ScanForServer()
        {
            try
            {
                // First test current URL
                string current = Program.NormalizeUrl(txtServerUrl.Text);
                if (Program.TestServerConnection(current, 1000)) return current;

                // Detect local IPv4 gateway / subnet
                string localIp = GetLocalIPv4();
                if (string.IsNullOrEmpty(localIp)) return null;

                string[] parts = localIp.Split('.');
                if (parts.Length != 4) return null;
                string baseSubnet = parts[0] + "." + parts[1] + "." + parts[2] + ".";

                // Quick scan range (common router ranges 1..60, 100..150)
                List<int> probeIps = new List<int>();
                // Prioritize known common server host IPs
                probeIps.Add(33); // Current host IP
                probeIps.Add(1);
                probeIps.Add(2);
                probeIps.Add(10);
                probeIps.Add(100);

                for (int i = 3; i <= 60; i++) if (!probeIps.Contains(i)) probeIps.Add(i);

                string found = null;
                object lockObj = new object();

                int total = probeIps.Count;
                int tested = 0;

                // Parallel probe
                System.Threading.Tasks.Parallel.ForEach(probeIps, new System.Threading.Tasks.ParallelOptions { MaxDegreeOfParallelism = 12 }, (ipEnd) =>
                {
                    if (found != null) return;
                    string candidate = "http://" + baseSubnet + ipEnd + ":3000";
                    if (Program.TestServerConnection(candidate, 800))
                    {
                        lock (lockObj)
                        {
                            if (found == null) found = candidate;
                        }
                    }
                    int currentTested = Interlocked.Increment(ref tested);
                    if (currentTested % 4 == 0)
                    {
                        this.Invoke((MethodInvoker)delegate
                        {
                            if (progressBar.Visible)
                            {
                                int pct = Math.Min(100, (currentTested * 100) / total);
                                progressBar.Value = pct;
                            }
                        });
                    }
                });

                return found;
            }
            catch
            {
                return null;
            }
        }

        private string GetLocalIPv4()
        {
            foreach (var net in NetworkInterface.GetAllNetworkInterfaces())
            {
                if (net.OperationalStatus == OperationalStatus.Up &&
                    net.NetworkInterfaceType != NetworkInterfaceType.Loopback)
                {
                    foreach (var ip in net.GetIPProperties().UnicastAddresses)
                    {
                        if (ip.Address.AddressFamily == AddressFamily.InterNetwork &&
                            !ip.Address.ToString().StartsWith("169.254"))
                        {
                            return ip.Address.ToString();
                        }
                    }
                }
            }
            return "192.168.1.1";
        }

        private void ShowHelp()
        {
            MessageBox.Show(
                "HOW TO CONNECT TO BAKO'S PANEL SERVER:\n\n" +
                "1. Main Computer (Server):\n" +
                "   Make sure 'Bako's Panel Server' is running on the main PC.\n" +
                "   The server window will display its address (e.g. http://192.168.1.33:3000).\n\n" +
                "2. Network Connection:\n" +
                "   Ensure this computer is connected to the same Wi-Fi or office network as the server PC.\n\n" +
                "3. Workstation Client:\n" +
                "   Enter the server URL in this window and click 'Connect to Server'.\n" +
                "   The client will remember the server address permanently.\n\n" +
                "4. Auto-Detect:\n" +
                "   Click 'Auto-Detect Server' if the server computer's IP address changed.",
                "Workstation Connection Help",
                MessageBoxButtons.OK,
                MessageBoxIcon.Information
            );
        }
    }
}
