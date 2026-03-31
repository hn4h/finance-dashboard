import { detectParserType } from './src/services/emailConfig';

const text = `-1,500,000 VND Số tiền thay đổi/ Changed Amount So the 4158xxxx7020 RUT TIEN TAI ATM 1500000VND va phi 0VND tai VPBANK HOI SO CDM 3 89 LANG HAVN luc 02/12/2026 15:06:59 Nội dung/ Transaction Content 12/02/2026 15:06 Thời gian/ Time 18,785,460 VND Hạn mức còn lại/ Available Limit Thẻ ghi nợ/4158xxxx7020 Thẻ/ Card FT26043746304379 Mã giao dịch/ Transaction Code`;

let amount: number | null = null;
const changedMatch = text.match(/(?:Số tiền thay đổi|Changed Amount)[^:]*:?\s*([+-]?[\d,]+)\s*VN[DĐ]/i)
    || text.match(/([+-][\d,]+)\s*VN[DĐ]\s*(?:Số tiền thay đổi|Changed Amount)/i);

if (changedMatch) {
    console.log("Changed match", changedMatch[1])
} else {
    console.log("No changed match")
}

const dateMatch = text.match(
    /(?:Ngày.*giờ giao dịch|Transaction date|Thời gian|Time)[^:]*:?\s*(\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}(?::\d{2})?)/i,
) || text.match(
    /(\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}(?::\d{2})?)\s*(?:Thời gian|Time)/i,
);
console.log("Date match:", dateMatch && dateMatch[1]);

const descMatch = text.match(
    /(?:Nội dung(?:\s+chuyển\s+tiền)?|ND|Description)[:\s]+(.+?)(?:\s*(?:Loại phí|Charge|Ngày|Transaction date|Số tiền|Fee Amount|Tên người|Mã giao dịch|Thời gian|$))/i,
);

console.log("Desc match (label before value):", descMatch && descMatch[1]);

const descMatch2 = text.match(
    /(?:VN[DĐ]|Amount)\s+(.*?)\s+(?:Nội dung|Transaction Content)/i
);
console.log("Desc match 2 (value before label):", descMatch2 && descMatch2[1]);

