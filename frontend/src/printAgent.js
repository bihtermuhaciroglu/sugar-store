import { PRINT_AGENT_TOKEN, PRINT_AGENT_URL } from "./config.js";

export async function printOnLocalAgent({ printerType, zpl, label }) {
  let res;
  try {
    res = await fetch(`${PRINT_AGENT_URL}/print`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Agent-Token": PRINT_AGENT_TOKEN,
      },
      body: JSON.stringify({ printerType, zpl, label }),
    });
  } catch {
    throw new Error(
      "Etiket yazıcısı bu bilgisayarda bulunamadı. Bu özellik sadece mağazadaki, print-agent çalışan bilgisayardan kullanılabilir."
    );
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Yazdırma başarısız: ${res.status}`);
  }
  return res.json();
}
