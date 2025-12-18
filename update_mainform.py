#!/usr/bin/env python3
path = r'c:\Users\User\Documents\Project_Aura\client\src\Components\Main Form\MainForm.jsx'
with open(path, 'r') as f:
    content = f.read()

# Hide message button for teachers
content = content.replace(
    '          <button className="message-btn" title="Messages" type="button" onClick={() => { setShowMessages(true); setShowSurvey(false); }}>\n            <FaRegMessage />\n          </button>',
    '          {role !== \'teacher\' && (\n            <button className="message-btn" title="Messages" type="button" onClick={() => { setShowMessages(true); setShowSurvey(false); }}>\n              <FaRegMessage />\n            </button>\n          )}'
)

# Hide Messages panel for teachers
content = content.replace(
    '      {showMessages && (\n        <div className="panel messages-panel active">\n          <Messages onClose={() => setShowMessages(false)} />\n        </div>\n      )}',
    '      {showMessages && role !== \'teacher\' && (\n        <div className="panel messages-panel active">\n          <Messages onClose={() => setShowMessages(false)} />\n        </div>\n      )}'
)

with open(path, 'w') as f:
    f.write(content)
print('Updated MainForm.jsx successfully')
