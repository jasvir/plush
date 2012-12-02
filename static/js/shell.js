// Copyright 2012 Google Inc. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

define(['jquery',
    'annotation', 'api', 'cwd', 'help', 'history', 'input', 'jobs', 'status'],
function($, annotation, api, cwd, help, history, input, jobs, status) {
  "use strict";

  var screen = $('#screen');
  var commandline = $('#commandline');


  function updateContext(ctx) {
    if (ctx.cwd) {
      cwd.parseToDom(ctx.cwd, runCommand);
      status.updateStatusPane(ctx.cwd, runCommand);
    }
    var envList = $('#context-env');
    var shList = $('#context-shell');
    envList.empty();
    shList.empty();
    var vars = ctx.vars || [];
    vars.forEach(function(v) {
      var dt = $('<dt></dt>', { class: v.mode });
      var dd = $('<dd></dd>', { class: v.mode });
      dt.text(v.name);
      dd.text(v.value);
      if (v.scope === 'env') { envList.append(dt); envList.append(dd); }
      if (v.scope === 'shell') { shList.append(dt); shList.append(dd); }
    });
  }

  function runContext() {
    api.runStatus('context', function (d) {
      if ('jsonout' in d) {
        d.jsonout.forEach(updateContext);
      }
    });
  }


  function jobOutput(d) {
    var job = ('job' in d) ? d.job : "unknown";
    var j = jobs.fromJob(job);

    if ('stdout' in d) {
      j.addOutput('stdout', d.stdout);
    }
    if ('stderr' in d) {
      j.addOutput('stderr', d.stderr);
    }
    if ('jsonout' in d) {
      var s = "";
      d.jsonout.forEach(function(j) {
        s += JSON.stringify(j, null, 4);
        s += "\n";
      });
      j.addOutput('stdout', s);
    }
    if ('parseError' in d) {
      j.addOutput('error', d.parseError);
    }
    if ('running' in d) {
      if (d.running) {
        j.setRunning();
      }
      else {
        j.setComplete(d.exitcode);
        commandline.focus();
        runContext();
      }
    }
  }

  function runCommand(cmd) {
    var j = jobs.newJob(cmd);
    api.runUser(cmd, jobOutput, j.job)
  }

  function runCommandline() {
    var cmd = commandline.val();
    commandline.val('');
    if (cmd.trim() !== '') {
      annotation.clearAnnotations();
      runCommand(cmd);
    }
  }

  function reenterTopic() {
    var c = commandline.val();
    var t = jobs.topicCommand();
    c = c.length ? ' # ' + c : '';
    commandline.val(t + c);
    commandline.focus();
  }


  var commandlineKeydown = input.keyHandler({
    'TAB':                  function() { annotation.startCompletions(); },
    'RETURN':               function() { runCommandline(); },
    'SPACE, LEFT, RIGHT':   function() { return input.STOP_PROPIGATION; }
  });

  commandline.keydown(function(e) {
    var r;
    r = help.keydown(e);        if (r !== undefined) return r;
    r = history.keydown(e);     if (r !== undefined) return r;
    r = commandlineKeydown(e);  if (r !== undefined) return r;
  });

  commandline.keyup(function(e) {
    var r = history.commandChange();
    if (r !== undefined) return r;
    var r = annotation.commandChange();
    if (r !== undefined) return r;

    annotation.requestRunComplete();
  });

  var shellKeydown = input.keyHandler({
    'RETURN, ALT+RETURN': function() { reenterTopic(); },
    'LEFT,   ALT+LEFT':   function() { commandline.focus(); },
    'UP,     ALT+UP':     function() { jobs.nextTopic(1); },
    'RIGHT,  ALT+RIGHT':  function() { jobs.nextTopic(0); },
    'DOWN,   ALT+DOWN':
      function() {
        if (jobs.atLastTopic())      commandline.focus();
        else                         jobs.nextTopic(-1);
      }
  });

  $(window).on('keydown', function(e) {
    var r;
    r = help.keydown(e);      if (r !== undefined) return r;
    r = history.keydown(e);   if (r !== undefined) return r;
    r = shellKeydown(e);      if (r !== undefined) return r;
    r = jobs.keydown(e);      if (r !== undefined) return r;
  });


  runContext();
});
