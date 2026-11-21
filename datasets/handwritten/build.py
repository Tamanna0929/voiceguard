# Builds datasets/voiceguard-handwritten-calls.jsonl  (run: python build.py)
# Original, team-written call scripts (NOT scraped, NOT machine-translated). label 1 = scam, 0 = legitimate.
import json, os
S = {  # scam scripts: id -> {lang: [turns]}
"digital_arrest": {
 "hi": ["मैं सीबीआई दिल्ली से बोल रहा हूँ। आपके आधार नंबर से एक पार्सल पकड़ा गया है जिसमें ड्रग्स मिले हैं।",
        "आपके खिलाफ गिरफ्तारी वारंट जारी हो चुका है। आप अभी वीडियो कॉल पर रहिए, किसी को बताना मत।",
        "आप डिजिटल अरेस्ट में हैं। केस बंद करवाना है तो जाँच के लिए अपने खाते का पैसा हमारे सरकारी खाते में ट्रांसफर करना होगा।",
        "अभी तुरंत पचास हज़ार रुपये भेजिए, वरना पुलिस आपके घर पहुँच जाएगी।"],
 "pa": ["ਮੈਂ ਸੀਬੀਆਈ ਦਿੱਲੀ ਤੋਂ ਬੋਲ ਰਿਹਾ ਹਾਂ। ਤੁਹਾਡੇ ਆਧਾਰ ਨੰਬਰ ਨਾਲ ਇੱਕ ਪਾਰਸਲ ਫੜਿਆ ਗਿਆ ਹੈ ਜਿਸ ਵਿੱਚ ਨਸ਼ੇ ਮਿਲੇ ਹਨ।",
        "ਤੁਹਾਡੇ ਖ਼ਿਲਾਫ਼ ਗ੍ਰਿਫ਼ਤਾਰੀ ਵਾਰੰਟ ਜਾਰੀ ਹੋ ਗਿਆ ਹੈ। ਤੁਸੀਂ ਹੁਣੇ ਵੀਡੀਓ ਕਾਲ 'ਤੇ ਰਹੋ, ਕਿਸੇ ਨੂੰ ਦੱਸਣਾ ਨਹੀਂ।",
        "ਤੁਸੀਂ ਡਿਜੀਟਲ ਅਰੈਸਟ ਵਿੱਚ ਹੋ। ਕੇਸ ਬੰਦ ਕਰਵਾਉਣਾ ਹੈ ਤਾਂ ਜਾਂਚ ਲਈ ਆਪਣੇ ਖਾਤੇ ਦਾ ਪੈਸਾ ਸਾਡੇ ਸਰਕਾਰੀ ਖਾਤੇ ਵਿੱਚ ਟਰਾਂਸਫਰ ਕਰੋ।",
        "ਹੁਣੇ ਪੰਜਾਹ ਹਜ਼ਾਰ ਰੁਪਏ ਭੇਜੋ, ਨਹੀਂ ਤਾਂ ਪੁਲਿਸ ਤੁਹਾਡੇ ਘਰ ਪਹੁੰਚ ਜਾਵੇਗੀ।"],
 "hn": ["Main CBI Delhi se bol raha hoon. Aapke Aadhaar number se ek parcel pakda gaya hai jisme drugs mile hain.",
        "Aapke khilaf arrest warrant jari ho gaya hai. Aap abhi video call par rahiye, kisi ko batana mat.",
        "Aap digital arrest me hain. Case band karwana hai to jaanch ke liye apne account ka paisa hamare government account me transfer karna hoga.",
        "Abhi turant pachaas hazaar rupaye bhejiye, warna police aapke ghar pahunch jayegi."]},
"bank_kyc": {
 "hi": ["नमस्ते, मैं एसबीआई बैंक से बोल रहा हूँ। आपका केवाईसी अपडेट नहीं है, आज रात आपका खाता ब्लॉक हो जाएगा।",
        "आपके मोबाइल पर एक ओटीपी आया होगा, वह मुझे अभी बताइए ताकि मैं केवाईसी पूरा कर दूँ।",
        "सर जल्दी कीजिए, सिर्फ पाँच मिनट बचे हैं। अपना डेबिट कार्ड नंबर और सीवीवी भी बता दीजिए।"],
 "pa": ["ਸਤ ਸ੍ਰੀ ਅਕਾਲ, ਮੈਂ ਐਸਬੀਆਈ ਬੈਂਕ ਤੋਂ ਬੋਲ ਰਿਹਾ ਹਾਂ। ਤੁਹਾਡੀ ਕੇਵਾਈਸੀ ਅੱਪਡੇਟ ਨਹੀਂ ਹੈ, ਅੱਜ ਰਾਤ ਤੁਹਾਡਾ ਖਾਤਾ ਬਲੌਕ ਹੋ ਜਾਵੇਗਾ।",
        "ਤੁਹਾਡੇ ਮੋਬਾਈਲ 'ਤੇ ਇੱਕ ਓਟੀਪੀ ਆਇਆ ਹੋਵੇਗਾ, ਉਹ ਮੈਨੂੰ ਹੁਣੇ ਦੱਸੋ ਤਾਂ ਜੋ ਮੈਂ ਕੇਵਾਈਸੀ ਪੂਰੀ ਕਰ ਦਿਆਂ।",
        "ਜੀ ਜਲਦੀ ਕਰੋ, ਸਿਰਫ਼ ਪੰਜ ਮਿੰਟ ਬਚੇ ਹਨ। ਆਪਣਾ ਡੈਬਿਟ ਕਾਰਡ ਨੰਬਰ ਤੇ ਸੀਵੀਵੀ ਵੀ ਦੱਸ ਦਿਓ।"],
 "hn": ["Namaste, main SBI bank se bol raha hoon. Aapka KYC update nahi hai, aaj raat aapka account block ho jayega.",
        "Aapke mobile par ek OTP aaya hoga, wo mujhe abhi bataiye taaki main KYC pura kar doon.",
        "Sir jaldi kijiye, sirf paanch minute bache hain. Apna debit card number aur CVV bhi bata dijiye."]},
"electricity": {
 "hi": ["बिजली विभाग से बोल रहे हैं। आपका पिछले महीने का बिल जमा नहीं हुआ है, आज रात नौ बजे आपकी बिजली काट दी जाएगी।",
        "अभी बिल भरना है तो मैं आपको एक लिंक भेजता हूँ, उसपर क्लिक करके यूपीआई से भुगतान कर दीजिए।",
        "या फिर यह ऐप डाउनलोड कर लीजिए, मैं आपका मीटर यहीं से ठीक कर दूँगा।"],
 "pa": ["ਬਿਜਲੀ ਵਿਭਾਗ ਤੋਂ ਬੋਲ ਰਹੇ ਹਾਂ। ਤੁਹਾਡਾ ਪਿਛਲੇ ਮਹੀਨੇ ਦਾ ਬਿੱਲ ਜਮ੍ਹਾਂ ਨਹੀਂ ਹੋਇਆ, ਅੱਜ ਰਾਤ ਨੌਂ ਵਜੇ ਤੁਹਾਡੀ ਬਿਜਲੀ ਕੱਟ ਦਿੱਤੀ ਜਾਵੇਗੀ।",
        "ਹੁਣੇ ਬਿੱਲ ਭਰਨਾ ਹੈ ਤਾਂ ਮੈਂ ਤੁਹਾਨੂੰ ਇੱਕ ਲਿੰਕ ਭੇਜਦਾ ਹਾਂ, ਉਸ 'ਤੇ ਕਲਿੱਕ ਕਰਕੇ ਯੂਪੀਆਈ ਨਾਲ ਭੁਗਤਾਨ ਕਰ ਦਿਓ।",
        "ਜਾਂ ਫਿਰ ਇਹ ਐਪ ਡਾਊਨਲੋਡ ਕਰ ਲਓ, ਮੈਂ ਤੁਹਾਡਾ ਮੀਟਰ ਇੱਥੋਂ ਹੀ ਠੀਕ ਕਰ ਦਿਆਂਗਾ।"],
 "hn": ["Bijli vibhag se bol rahe hain. Aapka pichhle mahine ka bill jama nahi hua hai, aaj raat nau baje aapki bijli kaat di jayegi.",
        "Abhi bill bharna hai to main aapko ek link bhejta hoon, us par click karke UPI se payment kar dijiye.",
        "Ya phir ye app download kar lijiye, main aapka meter yahin se theek kar dunga."]},
"courier": {
 "hi": ["यह फेडेक्स से कॉल है। आपके नाम से मुंबई कस्टम में एक पार्सल रुका है जिसमें पाँच पासपोर्ट और प्रतिबंधित सामान मिला है।",
        "आपको साइबर क्राइम ब्रांच से बात करवाता हूँ। यह मामला गंभीर है, आप किसी को मत बताइए।",
        "कार्रवाई से बचना है तो वेरिफिकेशन के लिए यह रकम जमा करवानी होगी।"],
 "pa": ["ਇਹ ਫੈਡੈਕਸ ਤੋਂ ਕਾਲ ਹੈ। ਤੁਹਾਡੇ ਨਾਂ 'ਤੇ ਮੁੰਬਈ ਕਸਟਮ ਵਿੱਚ ਇੱਕ ਪਾਰਸਲ ਰੁਕਿਆ ਹੈ ਜਿਸ ਵਿੱਚ ਪੰਜ ਪਾਸਪੋਰਟ ਤੇ ਪਾਬੰਦੀਸ਼ੁਦਾ ਸਮਾਨ ਮਿਲਿਆ ਹੈ।",
        "ਤੁਹਾਨੂੰ ਸਾਈਬਰ ਕ੍ਰਾਈਮ ਬ੍ਰਾਂਚ ਨਾਲ ਗੱਲ ਕਰਵਾਉਂਦਾ ਹਾਂ। ਇਹ ਮਾਮਲਾ ਗੰਭੀਰ ਹੈ, ਤੁਸੀਂ ਕਿਸੇ ਨੂੰ ਨਾ ਦੱਸਿਓ।",
        "ਕਾਰਵਾਈ ਤੋਂ ਬਚਣਾ ਹੈ ਤਾਂ ਵੈਰੀਫਿਕੇਸ਼ਨ ਲਈ ਇਹ ਰਕਮ ਜਮ੍ਹਾਂ ਕਰਵਾਉਣੀ ਪਵੇਗੀ।"],
 "hn": ["Ye FedEx se call hai. Aapke naam se Mumbai customs me ek parcel ruka hai jisme paanch passport aur pratibandhit saaman mila hai.",
        "Aapko cyber crime branch se baat karwata hoon. Ye mamla gambhir hai, aap kisi ko mat bataiye.",
        "Action se bachna hai to verification ke liye ye rakam jama karwani hogi."]},
"lottery": {
 "hi": ["बधाई हो! आपका नंबर केबीसी लकी ड्रॉ में पच्चीस लाख रुपये के लिए चुना गया है।",
        "इनाम पाने के लिए पहले प्रोसेसिंग फीस के पाँच हज़ार रुपये इस नंबर पर फोनपे कर दीजिए।",
        "यह मौका सिर्फ आज के लिए है, देर की तो इनाम किसी और को दे दिया जाएगा।"],
 "pa": ["ਵਧਾਈਆਂ! ਤੁਹਾਡਾ ਨੰਬਰ ਕੇਬੀਸੀ ਲੱਕੀ ਡਰਾਅ ਵਿੱਚ ਪੰਝੀ ਲੱਖ ਰੁਪਏ ਲਈ ਚੁਣਿਆ ਗਿਆ ਹੈ।",
        "ਇਨਾਮ ਲੈਣ ਲਈ ਪਹਿਲਾਂ ਪ੍ਰੋਸੈਸਿੰਗ ਫੀਸ ਦੇ ਪੰਜ ਹਜ਼ਾਰ ਰੁਪਏ ਇਸ ਨੰਬਰ 'ਤੇ ਫੋਨਪੇ ਕਰ ਦਿਓ।",
        "ਇਹ ਮੌਕਾ ਸਿਰਫ਼ ਅੱਜ ਲਈ ਹੈ, ਦੇਰ ਕੀਤੀ ਤਾਂ ਇਨਾਮ ਕਿਸੇ ਹੋਰ ਨੂੰ ਦੇ ਦਿੱਤਾ ਜਾਵੇਗਾ।"],
 "hn": ["Badhai ho! Aapka number KBC lucky draw me pachchis lakh rupaye ke liye chuna gaya hai.",
        "Inaam pane ke liye pehle processing fee ke paanch hazaar rupaye is number par PhonePe kar dijiye.",
        "Ye mauka sirf aaj ke liye hai, der ki to inaam kisi aur ko de diya jayega."]},
"techsupport": {
 "hi": ["मैं माइक्रोसॉफ्ट टेक सपोर्ट से बोल रहा हूँ। आपके कंप्यूटर में वायरस आ गया है और आपका बैंक डेटा चोरी हो रहा है।",
        "आप अभी एनीडेस्क डाउनलोड कीजिए और उसका कोड मुझे बताइए, मैं रिमोट से ठीक कर दूँगा।",
        "अब अपनी नेट बैंकिंग खोलिए ताकि मैं देख सकूँ कि कहीं पैसे तो नहीं निकले।"],
 "pa": ["ਮੈਂ ਮਾਈਕ੍ਰੋਸਾਫਟ ਟੈਕ ਸਪੋਰਟ ਤੋਂ ਬੋਲ ਰਿਹਾ ਹਾਂ। ਤੁਹਾਡੇ ਕੰਪਿਊਟਰ ਵਿੱਚ ਵਾਇਰਸ ਆ ਗਿਆ ਹੈ ਤੇ ਤੁਹਾਡਾ ਬੈਂਕ ਡਾਟਾ ਚੋਰੀ ਹੋ ਰਿਹਾ ਹੈ।",
        "ਤੁਸੀਂ ਹੁਣੇ ਐਨੀਡੈਸਕ ਡਾਊਨਲੋਡ ਕਰੋ ਤੇ ਉਸਦਾ ਕੋਡ ਮੈਨੂੰ ਦੱਸੋ, ਮੈਂ ਰਿਮੋਟ ਨਾਲ ਠੀਕ ਕਰ ਦਿਆਂਗਾ।",
        "ਹੁਣ ਆਪਣੀ ਨੈੱਟ ਬੈਂਕਿੰਗ ਖੋਲ੍ਹੋ ਤਾਂ ਜੋ ਮੈਂ ਦੇਖ ਸਕਾਂ ਕਿ ਕਿਤੇ ਪੈਸੇ ਤਾਂ ਨਹੀਂ ਨਿਕਲੇ।"],
 "hn": ["Main Microsoft tech support se bol raha hoon. Aapke computer me virus aa gaya hai aur aapka bank data chori ho raha hai.",
        "Aap abhi AnyDesk download kijiye aur uska code mujhe bataiye, main remote se theek kar dunga.",
        "Ab apni net banking kholiye taaki main dekh sakun ki kahin paise to nahi nikle."]},
"card_limit": {
 "hi": ["आपके क्रेडिट कार्ड की लिमिट बढ़ाई जा रही है, बस वेरिफिकेशन के लिए कार्ड के पीछे का तीन अंकों का नंबर बताइए।",
        "और जो छह अंकों का कोड अभी आपके फोन पर आया है, वह भी बता दीजिए।"],
 "pa": ["ਤੁਹਾਡੇ ਕ੍ਰੈਡਿਟ ਕਾਰਡ ਦੀ ਲਿਮਿਟ ਵਧਾਈ ਜਾ ਰਹੀ ਹੈ, ਬੱਸ ਵੈਰੀਫਿਕੇਸ਼ਨ ਲਈ ਕਾਰਡ ਦੇ ਪਿੱਛੇ ਦਾ ਤਿੰਨ ਅੰਕਾਂ ਵਾਲਾ ਨੰਬਰ ਦੱਸੋ।",
        "ਤੇ ਜੋ ਛੇ ਅੰਕਾਂ ਦਾ ਕੋਡ ਹੁਣੇ ਤੁਹਾਡੇ ਫ਼ੋਨ 'ਤੇ ਆਇਆ ਹੈ, ਉਹ ਵੀ ਦੱਸ ਦਿਓ।"],
 "hn": ["Aapke credit card ki limit badhai ja rahi hai, bas verification ke liye card ke peeche ka teen ank wala number bataiye.",
        "Aur jo chhe ank ka code abhi aapke phone par aaya hai, wo bhi bata dijiye."]},
"family_emergency": {
 "hi": ["हेलो दादाजी, मैं बोल रहा हूँ। मेरा एक्सीडेंट हो गया है, मैं पुलिस थाने में हूँ। प्लीज़ पापा को मत बताना।",
        "वकील को अभी बीस हज़ार रुपये देने हैं वरना मुझे जेल हो जाएगी। इस नंबर पर तुरंत भेज दीजिए।"],
 "pa": ["ਹੈਲੋ ਦਾਦਾ ਜੀ, ਮੈਂ ਬੋਲ ਰਿਹਾ ਹਾਂ। ਮੇਰਾ ਐਕਸੀਡੈਂਟ ਹੋ ਗਿਆ ਹੈ, ਮੈਂ ਪੁਲਿਸ ਥਾਣੇ ਵਿੱਚ ਹਾਂ। ਪਲੀਜ਼ ਪਾਪਾ ਨੂੰ ਨਾ ਦੱਸਣਾ।",
        "ਵਕੀਲ ਨੂੰ ਹੁਣੇ ਵੀਹ ਹਜ਼ਾਰ ਰੁਪਏ ਦੇਣੇ ਹਨ ਨਹੀਂ ਤਾਂ ਮੈਨੂੰ ਜੇਲ੍ਹ ਹੋ ਜਾਵੇਗੀ। ਇਸ ਨੰਬਰ 'ਤੇ ਤੁਰੰਤ ਭੇਜ ਦਿਓ।"],
 "hn": ["Hello dadaji, main bol raha hoon. Mera accident ho gaya hai, main police thane me hoon. Please papa ko mat batana.",
        "Vakeel ko abhi bees hazaar rupaye dene hain warna mujhe jail ho jayegi. Is number par turant bhej dijiye."]},
"task_job": {
 "hi": ["नमस्ते, हमारी कंपनी में घर बैठे पार्ट टाइम काम है। यूट्यूब वीडियो लाइक करने के हर टास्क पर पचास रुपये मिलेंगे।",
        "पहले सिर्फ एक हज़ार रुपये जमा कीजिए, वह वापस मिलेंगे और साथ में कमीशन भी। टेलीग्राम ग्रुप से जुड़िए।"],
 "pa": ["ਸਤ ਸ੍ਰੀ ਅਕਾਲ, ਸਾਡੀ ਕੰਪਨੀ ਵਿੱਚ ਘਰ ਬੈਠੇ ਪਾਰਟ ਟਾਈਮ ਕੰਮ ਹੈ। ਯੂਟਿਊਬ ਵੀਡੀਓ ਲਾਈਕ ਕਰਨ ਦੇ ਹਰ ਟਾਸਕ 'ਤੇ ਪੰਜਾਹ ਰੁਪਏ ਮਿਲਣਗੇ।",
        "ਪਹਿਲਾਂ ਸਿਰਫ਼ ਇੱਕ ਹਜ਼ਾਰ ਰੁਪਏ ਜਮ੍ਹਾਂ ਕਰੋ, ਉਹ ਵਾਪਸ ਮਿਲਣਗੇ ਤੇ ਨਾਲ ਕਮਿਸ਼ਨ ਵੀ। ਟੈਲੀਗ੍ਰਾਮ ਗਰੁੱਪ ਨਾਲ ਜੁੜੋ।"],
 "hn": ["Namaste, hamari company me ghar baithe part time kaam hai. YouTube video like karne ke har task par pachaas rupaye milenge.",
        "Pehle sirf ek hazar rupaye jama kijiye, wo wapas milenge aur saath me commission bhi. Telegram group se judiye."]},
"sim_trai": {
 "hi": ["यह ट्राई से कॉल है। आपके नंबर से गलत गतिविधियाँ हो रही हैं, दो घंटे में आपका सिम बंद कर दिया जाएगा।",
        "बंद होने से बचाना है तो नौ दबाइए और अपना आधार नंबर बताइए।"],
 "pa": ["ਇਹ ਟਰਾਈ ਤੋਂ ਕਾਲ ਹੈ। ਤੁਹਾਡੇ ਨੰਬਰ ਤੋਂ ਗਲਤ ਗਤੀਵਿਧੀਆਂ ਹੋ ਰਹੀਆਂ ਹਨ, ਦੋ ਘੰਟਿਆਂ ਵਿੱਚ ਤੁਹਾਡਾ ਸਿਮ ਬੰਦ ਕਰ ਦਿੱਤਾ ਜਾਵੇਗਾ।",
        "ਬੰਦ ਹੋਣ ਤੋਂ ਬਚਾਉਣਾ ਹੈ ਤਾਂ ਨੌਂ ਦਬਾਓ ਤੇ ਆਪਣਾ ਆਧਾਰ ਨੰਬਰ ਦੱਸੋ।"],
 "hn": ["Ye TRAI se call hai. Aapke number se galat gatividhiyan ho rahi hain, do ghante me aapka SIM band kar diya jayega.",
        "Band hone se bachana hai to nau dabaiye aur apna Aadhaar number bataiye."]},
"upi_refund": {
 "hi": ["सॉरी सर, गलती से आपके खाते में दस हज़ार रुपये चले गए हैं। प्लीज़ वापस भेज दीजिए।",
        "मैं आपको एक रिक्वेस्ट भेज रहा हूँ, बस यूपीआई पिन डालकर एक्सेप्ट कर दीजिए, पैसे वापस आ जाएँगे।"],
 "pa": ["ਸੌਰੀ ਜੀ, ਗਲਤੀ ਨਾਲ ਤੁਹਾਡੇ ਖਾਤੇ ਵਿੱਚ ਦਸ ਹਜ਼ਾਰ ਰੁਪਏ ਚਲੇ ਗਏ ਹਨ। ਪਲੀਜ਼ ਵਾਪਸ ਭੇਜ ਦਿਓ।",
        "ਮੈਂ ਤੁਹਾਨੂੰ ਇੱਕ ਰਿਕੁਐਸਟ ਭੇਜ ਰਿਹਾ ਹਾਂ, ਬੱਸ ਯੂਪੀਆਈ ਪਿੰਨ ਪਾ ਕੇ ਐਕਸੈਪਟ ਕਰ ਦਿਓ, ਪੈਸੇ ਵਾਪਸ ਆ ਜਾਣਗੇ।"],
 "hn": ["Sorry sir, galti se aapke account me das hazar rupaye chale gaye hain. Please wapas bhej dijiye.",
        "Main aapko ek request bhej raha hoon, bas UPI PIN daalkar accept kar dijiye, paise wapas aa jayenge."]},
"loan_fee": {
 "hi": ["आपका पाँच लाख का लोन बिना किसी दस्तावेज़ के मंज़ूर हो गया है।",
        "बस प्रोसेसिंग और इंश्योरेंस के लिए पहले आठ हज़ार रुपये भेजने होंगे, उसके बाद पैसा सीधे आपके खाते में आएगा।"],
 "pa": ["ਤੁਹਾਡਾ ਪੰਜ ਲੱਖ ਦਾ ਲੋਨ ਬਿਨਾਂ ਕਿਸੇ ਦਸਤਾਵੇਜ਼ ਦੇ ਮਨਜ਼ੂਰ ਹੋ ਗਿਆ ਹੈ।",
        "ਬੱਸ ਪ੍ਰੋਸੈਸਿੰਗ ਤੇ ਇੰਸ਼ੋਰੈਂਸ ਲਈ ਪਹਿਲਾਂ ਅੱਠ ਹਜ਼ਾਰ ਰੁਪਏ ਭੇਜਣੇ ਪੈਣਗੇ, ਉਸ ਤੋਂ ਬਾਅਦ ਪੈਸਾ ਸਿੱਧਾ ਤੁਹਾਡੇ ਖਾਤੇ ਵਿੱਚ ਆਵੇਗਾ।"],
 "hn": ["Aapka paanch lakh ka loan bina kisi document ke manjoor ho gaya hai.",
        "Bas processing aur insurance ke liye pehle aath hazar rupaye bhejne honge, uske baad paisa seedha aapke account me aayega."]},
}
L = {  # legitimate calls
"mother": {"hi":["हेलो बेटा, खाना खा लिया? आज शाम को घर कब तक आओगे?","ठीक है, मैं रोटी बना कर रखूँगी। रास्ते में दूध ले आना।"],
  "pa":["ਹੈਲੋ ਪੁੱਤ, ਰੋਟੀ ਖਾ ਲਈ? ਅੱਜ ਸ਼ਾਮ ਨੂੰ ਘਰ ਕਦੋਂ ਤੱਕ ਆਵੇਂਗਾ?","ਠੀਕ ਹੈ, ਮੈਂ ਰੋਟੀ ਬਣਾ ਕੇ ਰੱਖਾਂਗੀ। ਰਾਹ ਵਿੱਚ ਦੁੱਧ ਲੈ ਆਈਂ।"],
  "hn":["Hello beta, khana kha liya? Aaj shaam ko ghar kab tak aaoge?","Theek hai, main roti bana kar rakhungi. Raaste me doodh le aana."]},
"delivery": {"hi":["हेलो सर, मैं अमेज़न का डिलीवरी बॉय बोल रहा हूँ। मैं दस मिनट में आपकी गली में पहुँच रहा हूँ।","ठीक है, मैं गेट पर ही हूँ। आप आ जाइए।"],
  "pa":["ਹੈਲੋ ਜੀ, ਮੈਂ ਐਮਾਜ਼ਾਨ ਦਾ ਡਿਲੀਵਰੀ ਬੁਆਏ ਬੋਲ ਰਿਹਾ ਹਾਂ। ਮੈਂ ਦਸ ਮਿੰਟ ਵਿੱਚ ਤੁਹਾਡੀ ਗਲੀ ਵਿੱਚ ਪਹੁੰਚ ਰਿਹਾ ਹਾਂ।","ਠੀਕ ਹੈ, ਮੈਂ ਗੇਟ 'ਤੇ ਹੀ ਹਾਂ। ਤੁਸੀਂ ਆ ਜਾਓ।"],
  "hn":["Hello sir, main Amazon ka delivery boy bol raha hoon. Main das minute me aapki gali me pahunch raha hoon.","Theek hai, main gate par hi hoon. Aap aa jaiye."]},
"doctor": {"hi":["नमस्ते, यह सिटी क्लिनिक से कॉल है। कल सुबह ग्यारह बजे डॉक्टर के साथ आपका अपॉइंटमेंट है, क्या आप आ पाएँगे?","जी ठीक है, मैं आपका समय पक्का कर देती हूँ।"],
  "pa":["ਸਤ ਸ੍ਰੀ ਅਕਾਲ, ਇਹ ਸਿਟੀ ਕਲੀਨਿਕ ਤੋਂ ਕਾਲ ਹੈ। ਕੱਲ੍ਹ ਸਵੇਰੇ ਗਿਆਰਾਂ ਵਜੇ ਡਾਕਟਰ ਨਾਲ ਤੁਹਾਡੀ ਅਪਾਇੰਟਮੈਂਟ ਹੈ, ਕੀ ਤੁਸੀਂ ਆ ਸਕੋਗੇ?","ਜੀ ਠੀਕ ਹੈ, ਮੈਂ ਤੁਹਾਡਾ ਸਮਾਂ ਪੱਕਾ ਕਰ ਦਿੰਦੀ ਹਾਂ।"],
  "hn":["Namaste, ye City Clinic se call hai. Kal subah gyarah baje doctor ke saath aapka appointment hai, kya aap aa payenge?","Ji theek hai, main aapka time pakka kar deti hoon."]},
"friend": {"hi":["यार आज शाम को क्रिकेट खेलने चलें? मैदान में सब आ रहे हैं।","ठीक है, मैं छह बजे तेरे घर के बाहर मिलता हूँ।"],
  "pa":["ਯਾਰ ਅੱਜ ਸ਼ਾਮ ਨੂੰ ਕ੍ਰਿਕਟ ਖੇਡਣ ਚੱਲੀਏ? ਮੈਦਾਨ ਵਿੱਚ ਸਾਰੇ ਆ ਰਹੇ ਨੇ।","ਠੀਕ ਹੈ, ਮੈਂ ਛੇ ਵਜੇ ਤੇਰੇ ਘਰ ਦੇ ਬਾਹਰ ਮਿਲਦਾ ਹਾਂ।"],
  "hn":["Yaar aaj shaam ko cricket khelne chalen? Maidan me sab aa rahe hain.","Theek hai, main chhe baje tere ghar ke bahar milta hoon."]},
"bank_genuine": {"hi":["नमस्ते, आपके लोन की किस्त अगले हफ्ते देय है। कृपया अपने खाते में पर्याप्त शेष रखें।","आप बैंक की शाखा में या आधिकारिक ऐप से जानकारी देख सकते हैं। हम फोन पर कोई ओटीपी या पिन नहीं माँगते।"],
  "pa":["ਸਤ ਸ੍ਰੀ ਅਕਾਲ, ਤੁਹਾਡੇ ਲੋਨ ਦੀ ਕਿਸ਼ਤ ਅਗਲੇ ਹਫ਼ਤੇ ਬਕਾਇਆ ਹੈ। ਕਿਰਪਾ ਕਰਕੇ ਆਪਣੇ ਖਾਤੇ ਵਿੱਚ ਲੋੜੀਂਦਾ ਬਕਾਇਆ ਰੱਖੋ।","ਤੁਸੀਂ ਬੈਂਕ ਦੀ ਸ਼ਾਖਾ ਵਿੱਚ ਜਾਂ ਅਧਿਕਾਰਤ ਐਪ ਤੋਂ ਜਾਣਕਾਰੀ ਦੇਖ ਸਕਦੇ ਹੋ। ਅਸੀਂ ਫ਼ੋਨ 'ਤੇ ਕੋਈ ਓਟੀਪੀ ਜਾਂ ਪਿੰਨ ਨਹੀਂ ਮੰਗਦੇ।"],
  "hn":["Namaste, aapke loan ki kisht agle hafte deya hai. Kripya apne account me paryapt balance rakhein.","Aap bank ki shaakha me ya official app se jaankari dekh sakte hain. Hum phone par koi OTP ya PIN nahi maangte."]},
"school": {"hi":["नमस्ते, मैं बच्चे की क्लास टीचर बोल रही हूँ। शुक्रवार को अभिभावक बैठक है, आप आ सकेंगे?","धन्यवाद, तो फिर शुक्रवार को दस बजे मिलते हैं।"],
  "pa":["ਸਤ ਸ੍ਰੀ ਅਕਾਲ, ਮੈਂ ਬੱਚੇ ਦੀ ਕਲਾਸ ਟੀਚਰ ਬੋਲ ਰਹੀ ਹਾਂ। ਸ਼ੁੱਕਰਵਾਰ ਨੂੰ ਮਾਪਿਆਂ ਦੀ ਮੀਟਿੰਗ ਹੈ, ਤੁਸੀਂ ਆ ਸਕੋਗੇ?","ਧੰਨਵਾਦ, ਤਾਂ ਫਿਰ ਸ਼ੁੱਕਰਵਾਰ ਨੂੰ ਦਸ ਵਜੇ ਮਿਲਦੇ ਹਾਂ।"],
  "hn":["Namaste, main bachche ki class teacher bol rahi hoon. Shukrawar ko parents meeting hai, aap aa sakenge?","Dhanyawad, to phir Shukrawar ko das baje milte hain."]},
"electrician": {"hi":["हेलो, मैं बिजली मिस्त्री बोल रहा हूँ। आपने पंखा ठीक करवाने के लिए बुलाया था, मैं कल दोपहर आ जाऊँ?","ठीक है, कल दो बजे आ जाना। पैसे काम के बाद हिसाब से दे दूँगा।"],
  "pa":["ਹੈਲੋ, ਮੈਂ ਬਿਜਲੀ ਮਿਸਤਰੀ ਬੋਲ ਰਿਹਾ ਹਾਂ। ਤੁਸੀਂ ਪੱਖਾ ਠੀਕ ਕਰਵਾਉਣ ਲਈ ਬੁਲਾਇਆ ਸੀ, ਮੈਂ ਕੱਲ੍ਹ ਦੁਪਹਿਰ ਆ ਜਾਵਾਂ?","ਠੀਕ ਹੈ, ਕੱਲ੍ਹ ਦੋ ਵਜੇ ਆ ਜਾਣਾ। ਪੈਸੇ ਕੰਮ ਤੋਂ ਬਾਅਦ ਹਿਸਾਬ ਨਾਲ ਦੇ ਦਿਆਂਗਾ।"],
  "hn":["Hello, main bijli mistri bol raha hoon. Aapne pankha theek karwane ke liye bulaya tha, main kal dopahar aa jaun?","Theek hai, kal do baje aa jana. Paise kaam ke baad hisaab se de dunga."]},
}
rows = []
for k, v in S.items():
    for lg, t in v.items(): rows.append({"text": "\n".join(t), "label": 1, "lang": lg, "type": k})
for k, v in L.items():
    for lg, t in v.items(): rows.append({"text": "\n".join(t), "label": 0, "lang": lg, "type": k})
out = os.path.join(os.path.dirname(__file__), "..", "voiceguard-handwritten-calls.jsonl")
with open(out, "w", encoding="utf-8") as f:
    for r in rows: f.write(json.dumps(r, ensure_ascii=False) + "\n")
print(len(rows), "scripts ->", os.path.normpath(out))
