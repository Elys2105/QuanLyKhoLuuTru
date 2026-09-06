using System;
using System.Diagnostics;
using System.IO;
using Microsoft.Win32;
using System.Windows.Forms;

internal static class Program
{
    private const string AppUrl = "https://qlklt-v414-web-live.vercel.app/login";

    [STAThread]
    private static void Main()
    {
        string browser = FindBrowser();

        if (!String.IsNullOrEmpty(browser))
        {
            try
            {
                ProcessStartInfo psi = new ProcessStartInfo();
                psi.FileName = browser;
                psi.Arguments =
                    "--app=\"" + AppUrl + "\" " +
                    "--start-maximized " +
                    "--no-first-run " +
                    "--no-default-browser-check";
                psi.UseShellExecute = true;
                Process.Start(psi);
                return;
            }
            catch
            {
                MessageBox.Show(
                    "Không thể mở cửa sổ ứng dụng. Hãy kiểm tra Microsoft Edge hoặc Google Chrome.",
                    "QuanLyKhoLuuTru",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error
                );
                return;
            }
        }

        MessageBox.Show(
            "Cần Microsoft Edge hoặc Google Chrome để mở ứng dụng ở chế độ cửa sổ riêng.",
            "QuanLyKhoLuuTru",
            MessageBoxButtons.OK,
            MessageBoxIcon.Warning
        );
    }

    private static string FindBrowser()
    {
        string path;

        path = ReadAppPath(
            Registry.CurrentUser,
            @"SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\msedge.exe"
        );
        if (Exists(path)) return path;

        path = ReadAppPath(
            Registry.LocalMachine,
            @"SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\msedge.exe"
        );
        if (Exists(path)) return path;

        string pf86 = Environment.GetFolderPath(
            Environment.SpecialFolder.ProgramFilesX86
        );
        string pf = Environment.GetFolderPath(
            Environment.SpecialFolder.ProgramFiles
        );
        string local = Environment.GetFolderPath(
            Environment.SpecialFolder.LocalApplicationData
        );

        string[] edgeCandidates = new string[]
        {
            Path.Combine(pf86, @"Microsoft\Edge\Application\msedge.exe"),
            Path.Combine(pf, @"Microsoft\Edge\Application\msedge.exe"),
            Path.Combine(local, @"Microsoft\Edge\Application\msedge.exe")
        };

        foreach (string candidate in edgeCandidates)
        {
            if (Exists(candidate)) return candidate;
        }

        path = ReadAppPath(
            Registry.CurrentUser,
            @"SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\chrome.exe"
        );
        if (Exists(path)) return path;

        path = ReadAppPath(
            Registry.LocalMachine,
            @"SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\chrome.exe"
        );
        if (Exists(path)) return path;

        string[] chromeCandidates = new string[]
        {
            Path.Combine(pf, @"Google\Chrome\Application\chrome.exe"),
            Path.Combine(pf86, @"Google\Chrome\Application\chrome.exe"),
            Path.Combine(local, @"Google\Chrome\Application\chrome.exe")
        };

        foreach (string candidate in chromeCandidates)
        {
            if (Exists(candidate)) return candidate;
        }

        return null;
    }

    private static string ReadAppPath(RegistryKey root, string subKey)
    {
        try
        {
            using (RegistryKey key = root.OpenSubKey(subKey))
            {
                if (key == null) return null;

                object value = key.GetValue(null);
                if (value == null) return null;

                return value.ToString();
            }
        }
        catch
        {
            return null;
        }
    }

    private static bool Exists(string path)
    {
        return !String.IsNullOrEmpty(path) && File.Exists(path);
    }
}