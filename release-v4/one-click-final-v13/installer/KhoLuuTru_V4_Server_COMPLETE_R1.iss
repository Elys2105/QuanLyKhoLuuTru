#define MyAppName "Quan Ly Kho Luu Tru Server"
#define MyAppVersion "4.0.0.13-r1"
#define MyAppPublisher "QuanLyKhoLuuTru"

[Setup]
AppId={{4EC950D4-3B67-4FC6-A748-5F99EFD20819}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
DefaultDirName={autopf}\QuanLyKhoLuuTru\Server
DefaultGroupName=Quan Ly Kho Luu Tru
DisableProgramGroupPage=yes
UsePreviousAppDir=yes
OutputDir=D:\archive-management\release-v4\one-click-final-v13\output-complete-r1
OutputBaseFilename=KhoLuuTru_V4_Server_Setup_COMPLETE
PrivilegesRequired=admin
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
Compression=none
SolidCompression=no
DiskSpanning=yes
DiskSliceSize=2000000000
SlicesPerDisk=1
WizardStyle=modern
SetupLogging=yes
CloseApplications=yes
RestartApplications=no
UninstallDisplayName=Quan Ly Kho Luu Tru Server V4 Complete R1
Uninstallable=yes

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Files]
Source: "D:\\archive-management\\release-v4\\one-click-final-v13\\stage-server\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Dirs]
Name: "{commonappdata}\QuanLyKhoLuuTru\Server"
Name: "{commonappdata}\QuanLyKhoLuuTru\Server\logs"
Name: "{commonappdata}\QuanLyKhoLuuTru\Server\config"
Name: "{commonappdata}\QuanLyKhoLuuTru\Server\media"
Name: "{commonappdata}\QuanLyKhoLuuTru\Server\backups"
Name: "{commonappdata}\QuanLyKhoLuuTru\Server\temp"

[UninstallRun]
Filename: "{sys}\WindowsPowerShell\v1.0\powershell.exe"; Parameters: "-NoProfile -ExecutionPolicy Bypass -File ""{app}\bootstrap\UNINSTALL_SERVER_V13.ps1"" -InstallRoot ""{app}"""; Flags: runhidden waituntilterminated

[Code]
var
  DbPage: TInputQueryWizardPage;
  PostInstallPassed: Boolean;

function IsAllowedPasswordCharacter(C: Char): Boolean;
begin
  Result := Pos(C, 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#_-') > 0;
end;

function IsSafeDatabasePassword(Value: String): Boolean;
var
  I: Integer;
begin
  Result := (Length(Value) >= 8) and (Length(Value) <= 64);
  if not Result then
    Exit;

  for I := 1 to Length(Value) do
  begin
    if not IsAllowedPasswordCharacter(Value[I]) then
    begin
      Result := False;
      Exit;
    end;
  end;
end;

procedure InitializeWizard;
begin
  PostInstallPassed := False;
  DbPage := CreateInputQueryPage(
    wpSelectDir,
    'PostgreSQL administrator',
    'Enter the current or new postgres password',
    'For a new PostgreSQL installation, this becomes the postgres password. For an existing cluster, enter its current postgres password. Allowed: letters, numbers, @ # _ -.'
  );
  DbPage.Add('PostgreSQL password:', True);
end;

function NextButtonClick(CurPageID: Integer): Boolean;
begin
  Result := True;
  if CurPageID = DbPage.ID then
  begin
    if not IsSafeDatabasePassword(DbPage.Values[0]) then
    begin
      MsgBox('Use 8-64 characters containing only letters, numbers, @ # _ -.', mbError, MB_OK);
      Result := False;
    end;
  end;
end;

function StatusIsPass(StatusPath: String): Boolean;
var
  StatusText: AnsiString;
begin
  Result := False;
  if not FileExists(StatusPath) then
    Exit;
  if not LoadStringFromFile(StatusPath, StatusText) then
    Exit;
  Result := Pos('"status":"PASS"', String(StatusText)) > 0;
end;

procedure CurStepChanged(CurStep: TSetupStep);
var
  PasswordFile: String;
  StatusPath: String;
  Params: String;
  ResultCode: Integer;
  Started: Boolean;
  FailureMessage: String;
begin
  if CurStep = ssPostInstall then
  begin
    PasswordFile := ExpandConstant('{tmp}\qlklt-pg-password.txt');
    StatusPath := ExpandConstant('{commonappdata}\QuanLyKhoLuuTru\Server\config\install-status.json');
    DeleteFile(StatusPath);

    if not SaveStringToFile(PasswordFile, DbPage.Values[0], False) then
      RaiseException('Could not create the temporary PostgreSQL password file.');

    Params := '-NoProfile -ExecutionPolicy Bypass -File "' +
      ExpandConstant('{app}\bootstrap\POST_INSTALL_SERVER_V13.ps1') +
      '" -InstallRoot "' + ExpandConstant('{app}') +
      '" -DataRoot "' + ExpandConstant('{commonappdata}\QuanLyKhoLuuTru\Server') +
      '" -DatabasePasswordFile "' + PasswordFile + '"';

    Started := Exec(
      ExpandConstant('{sys}\WindowsPowerShell\v1.0\powershell.exe'),
      Params,
      '',
      SW_HIDE,
      ewWaitUntilTerminated,
      ResultCode
    );
    DeleteFile(PasswordFile);

    if not Started then
    begin
      FailureMessage := 'Could not start Server post-install. See logs under ' +
        ExpandConstant('{commonappdata}\QuanLyKhoLuuTru\Server\logs');
      MsgBox(FailureMessage, mbCriticalError, MB_OK);
      RaiseException(FailureMessage);
    end;

    if ResultCode <> 0 then
    begin
      FailureMessage := 'Server post-install failed with exit code ' + IntToStr(ResultCode) +
        '. See install-status.json and logs under ' +
        ExpandConstant('{commonappdata}\QuanLyKhoLuuTru\Server');
      MsgBox(FailureMessage, mbCriticalError, MB_OK);
      RaiseException(FailureMessage);
    end;

    if not StatusIsPass(StatusPath) then
    begin
      FailureMessage := 'Server post-install did not produce status PASS. See ' + StatusPath;
      MsgBox(FailureMessage, mbCriticalError, MB_OK);
      RaiseException(FailureMessage);
    end;

    PostInstallPassed := True;
  end;
end;

function ShouldSkipPage(PageID: Integer): Boolean;
begin
  Result := False;
end;