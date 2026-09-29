const removeVietnameseMarks = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLocaleLowerCase("vi")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const PROVINCES: Array<[string, string[]]> = [
  ["TP. Hồ Chí Minh", ["thanh pho ho chi minh", "tp ho chi minh", "tp hcm", "tphcm", "ho chi minh", "sai gon", "hcm"]],
  ["Hà Nội", ["thanh pho ha noi", "tp ha noi", "ha noi"]],
  ["Đà Nẵng", ["thanh pho da nang", "tp da nang", "da nang"]],
  ["Hải Phòng", ["thanh pho hai phong", "tp hai phong", "hai phong"]],
  ["Cần Thơ", ["thanh pho can tho", "tp can tho", "can tho"]],
  ...[
    "An Giang", "Bà Rịa - Vũng Tàu", "Bắc Giang", "Bắc Kạn", "Bạc Liêu", "Bắc Ninh",
    "Bến Tre", "Bình Định", "Bình Dương", "Bình Phước", "Bình Thuận", "Cà Mau",
    "Cao Bằng", "Đắk Lắk", "Đắk Nông", "Điện Biên", "Đồng Nai", "Đồng Tháp",
    "Gia Lai", "Hà Giang", "Hà Nam", "Hà Tĩnh", "Hải Dương", "Hậu Giang", "Hòa Bình",
    "Hưng Yên", "Khánh Hòa", "Kiên Giang", "Kon Tum", "Lai Châu", "Lâm Đồng", "Lạng Sơn",
    "Lào Cai", "Long An", "Nam Định", "Nghệ An", "Ninh Bình", "Ninh Thuận", "Phú Thọ",
    "Phú Yên", "Quảng Bình", "Quảng Nam", "Quảng Ngãi", "Quảng Ninh", "Quảng Trị",
    "Sóc Trăng", "Sơn La", "Tây Ninh", "Thái Bình", "Thái Nguyên", "Thanh Hóa",
    "Thừa Thiên Huế", "Tiền Giang", "Trà Vinh", "Tuyên Quang", "Vĩnh Long", "Vĩnh Phúc",
    "Yên Bái",
  ].map((name) => [name, [removeVietnameseMarks(name)]] as [string, string[]]),
];

const DISTRICT_TO_CITY: Array<[string, string[]]> = [
  ["TP. Hồ Chí Minh", [
    "quan 1", "quan 2", "quan 3", "quan 4", "quan 5", "quan 6", "quan 7", "quan 8",
    "quan 9", "quan 10", "quan 11", "quan 12", "binh thanh", "go vap", "tan binh",
    "tan phu", "phu nhuan", "binh tan", "thu duc", "cu chi", "hoc mon", "binh chanh",
    "nha be", "can gio",
  ]],
  ["Hà Nội", [
    "ba dinh", "hoan kiem", "tay ho", "long bien", "cau giay", "dong da", "hai ba trung",
    "hoang mai", "thanh xuan", "ha dong", "bac tu liem", "nam tu liem", "son tay", "ba vi",
    "chuong my", "dan phuong", "dong anh", "gia lam", "hoai duc", "me linh", "my duc",
    "phu xuyen", "phuc tho", "quoc oai", "soc son", "thach that", "thanh oai", "thanh tri",
    "thuong tin", "ung hoa",
  ]],
  ["Đà Nẵng", ["hai chau", "thanh khe", "son tra", "ngu hanh son", "lien chieu", "cam le", "hoa vang"]],
  ["Hải Phòng", ["hong bang", "ngo quyen", "le chan", "hai an", "kien an", "do son", "duong kinh", "an duong", "an lao", "cat hai", "kien thuy", "thuy nguyen", "tien lang", "vinh bao"]],
  ["Cần Thơ", ["ninh kieu", "o mon", "binh thuy", "cai rang", "thot not", "co do", "phong dien", "thoi lai", "vinh thanh"]],
];

const containsLocation = (normalizedAddress: string, location: string) =>
  (` ${normalizedAddress} `).includes(` ${location} `);

/** Returns only a province/municipality name; never returns a street or district. */
export function vietnamProvinceFromAddress(value: string) {
  const normalizedAddress = removeVietnameseMarks(value);
  if (!normalizedAddress) return "";

  for (const [province, aliases] of PROVINCES) {
    if (aliases.some((alias) => containsLocation(normalizedAddress, alias))) return province;
  }
  for (const [city, districts] of DISTRICT_TO_CITY) {
    if (districts.some((district) => containsLocation(normalizedAddress, district))) return city;
  }
  return "";
}
