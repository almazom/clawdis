import { runExec } from "../process/exec.js";
import { logVerbose } from "../globals.js";
import { loadConfig } from "../config/config.js";

export type AiClubReport = {

  status: string;

  command: string;

  period: string;

  channel: string;

  date: string;

  report_url: string;

  summary?: string;

  local_file?: string;

};



export async function getAiClubReport(period: "today" | "week"): Promise<{
  summary: string;
  url: string;
  channel: string;
} | null> {
  const flag = period === "today" ? "--today" : "--week";

  const cfg = loadConfig();
  const cmdPath = cfg.aiClub?.cliPath?.trim() || "ai_club";
  const timeoutMs = cfg.aiClub?.timeoutMs ?? 300000;



  logVerbose(`[ai-club] Running ${cmdPath} ${flag}`);







  try {



    const { stdout, stderr } = await runExec(cmdPath, [flag], { timeoutMs });



    



    if (stderr) {



      logVerbose(`[ai-club] stderr: ${stderr}`);



    }







    // Find the JSON part in the output



    const lastBraceIndex = stdout.lastIndexOf("}");



    const firstBraceIndex = stdout.lastIndexOf("{", lastBraceIndex);



    if (firstBraceIndex === -1 || lastBraceIndex === -1) {



      logVerbose(`[ai-club] Could not find JSON in output. Full stdout: ${stdout}`);



      return null;



    }







    const jsonStr = stdout.substring(firstBraceIndex, lastBraceIndex + 1);



    let report: AiClubReport;



    try {



      report = JSON.parse(jsonStr);



    } catch (parseErr) {



      logVerbose(`[ai-club] JSON parse failed: ${parseErr}. jsonStr: ${jsonStr}`);



      return null;



    }



    



    if (report.status !== "success") {



      logVerbose(`[ai-club] Report status is not success: ${report.status}. Full report: ${JSON.stringify(report)}`);



      return null;



    }







    let summary = report.summary || "";



    logVerbose(`[ai-club] Success! Summary length: ${summary.length}, URL: ${report.report_url}`);







    // Truncate summary for Telegram if it's too long



    if (summary.length > 3000) {



      summary = summary.substring(0, 3000) + "...";



    }







            return {







              summary: summary || `Report for ${report.period} is ready.`,







              url: report.report_url,







              channel: report.channel || "@aiclubsweggs",







            };







    



  } catch (err) {



    logVerbose(`[ai-club] Execution failed: ${err}`);



    if (err && typeof err === 'object' && 'stdout' in err) {



      logVerbose(`[ai-club] Failed stdout: ${err.stdout}`);



    }



    if (err && typeof err === 'object' && 'stderr' in err) {



      logVerbose(`[ai-club] Failed stderr: ${err.stderr}`);



    }



    return null;



  }



}





