import { useState } from "react";
import { OWNER_NAME } from "../config.js";

const MESSAGE_BUCKETS = [
  {
    maxHour: 6,
    messages: [
      `Bu saatte mi açtın beni ${OWNER_NAME}, biraz uyusana 😴`,
      `Gece yarısı mesaisi ha ${OWNER_NAME}, dinlenmeyi unutma 🙂`,
    ],
  },
  {
    maxHour: 9,
    messages: [
      `Günaydın ${OWNER_NAME}! Bugün bol kazançlı geçsin ☀️`,
      `Erkenci ${OWNER_NAME}, günaydın! Kahveni al da başlayalım ☕`,
    ],
  },
  {
    maxHour: 12,
    messages: [
      `Günaydın, saat 9'u geçti, biraz geç açtın beni 🙂`,
      `${OWNER_NAME}, uyandık mı nihayet? Günaydın 🙂`,
    ],
  },
  {
    maxHour: 15,
    messages: [
      `Öğlen oldu bile, elini çabuk tut ${OWNER_NAME} 🙂`,
      `Karnını doyurmayı unutma ${OWNER_NAME}, gün uzun 🍽️`,
    ],
  },
  {
    maxHour: 18,
    messages: [
      `İyi günler ${OWNER_NAME}, gün yarılandı bile ⏳`,
      `İkindi oldu, bakalım bugün nasıl gidiyor 🙂`,
    ],
  },
  {
    maxHour: 21,
    messages: [
      `Akşam oluyor ${OWNER_NAME}, bugün nasıl geçti bakalım 🙂`,
      `Gün batıyor, kapanışa doğru gidiyoruz ${OWNER_NAME} 🌇`,
    ],
  },
  {
    maxHour: 24,
    messages: [
      `Geç saatlere kadar çalışıyorsun ${OWNER_NAME}, eline sağlık 🙂`,
      `Kapanış vakti geldi ${OWNER_NAME}, bugünü de tamamladık 🌙`,
    ],
  },
];

function pickMessage(hour) {
  const bucket = MESSAGE_BUCKETS.find((b) => hour < b.maxHour) || MESSAGE_BUCKETS.at(-1);
  return bucket.messages[Math.floor(Math.random() * bucket.messages.length)];
}

export default function GreetingBanner() {
  const [message] = useState(() => pickMessage(new Date().getHours()));

  return <div className="banner banner-greeting">{message}</div>;
}
