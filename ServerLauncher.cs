using System;
using System.Diagnostics;
using System.IO;

namespace BakosPanelServer
{
    class Program
    {
        static void Main(string[] args)
        {
            string projectDir = AppDomain.CurrentDomain.BaseDirectory;
            string batFile = Path.Combine(projectDir, "Bako's Panel Server.bat");

            if (!File.Exists(batFile))
            {
                string cwdBat = Path.Combine(Directory.GetCurrentDirectory(), "Bako's Panel Server.bat");
                if (File.Exists(cwdBat))
                {
                    batFile = cwdBat;
                    projectDir = Directory.GetCurrentDirectory();
                }
            }

            if (!File.Exists(batFile))
            {
                Console.WriteLine("Could not locate Bako's Panel Server.bat in " + projectDir);
                Console.WriteLine("Press any key to exit...");
                Console.ReadKey();
                return;
            }

            ProcessStartInfo psi = new ProcessStartInfo
            {
                FileName = "cmd.exe",
                Arguments = "/k \"" + batFile + "\"",
                WorkingDirectory = projectDir,
                UseShellExecute = true
            };

            try
            {
                Process.Start(psi);
            }
            catch (Exception ex)
            {
                Console.WriteLine("Error launching server: " + ex.Message);
                Console.WriteLine("Press any key to exit...");
                Console.ReadKey();
            }
        }
    }
}
