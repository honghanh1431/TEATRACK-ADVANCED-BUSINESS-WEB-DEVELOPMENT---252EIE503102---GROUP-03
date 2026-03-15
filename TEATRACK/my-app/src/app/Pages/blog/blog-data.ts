export interface Blog {
  id: string;
  image: string;
  date: string;
  title: string;
  description: string;
  content: string;
}
export const BLOG_DATA = {
  'blog_1': {
    title: '2 tầng vị / 6 lớp hương',
    heading: 'KEM CHEESE & XÍ MUỘI - BỘ ĐÔI KHUẤY ĐẢO CÁC TẦNG VỊ ĐẦY MỚI MẺ',
    date: '13-15/06/2025',
    thumbnailImage: '/assets/images/blog_1.jpg', 
    image: '/assets/images/blog_1.1.jpeg', 
    headingColor: '#305C33',
    layoutType: 'single',
    content: `
      <p>Hồng Trà Ngô Gia trở lại với Bộ Sưu Tập "Tầng Vị – Lớp Hương", mang theo sự hòa quyện tinh tế giữa vị trà thuần khiết và những tầng cảm xúc đa sắc. Mỗi tách trà là một hành trình hương vị – nơi vị đậm đà của lá trà gặp gỡ hương thơm tinh tế của thiên nhiên, tạo nên trải nghiệm đầy cảm xúc.</p>
      <p>Lấy cảm hứng từ những khoảnh khắc tĩnh lặng trong đời sống hiện đại, "Tầng Vị – Lớp Hương" không chỉ là sự kết hợp của nguyên liệu tinh tuyển, mà còn là lời mời gọi bạn dừng lại, hít thở sâu, và tận hưởng từng phút giây an yên bên ly trà Ngô Gia.</p>
      <p>Từ độ chua thanh của Xí Muội đến độ béo mịn của Kem Cheese, mỗi ngụm trà là một hành trình nhỏ – mở ra lớp hương sau cùng bằng sự lưu luyến và thư giãn.</p>
      <ul>
        <li>Trà Xí Muội Ngô Gia (M/L)</li>
        <li>Trà Xí Muội Ô Long (M/L)</li>
        <li>Trà Xí Muội Bí Đao (M/L)</li>
        <li>Hồng Trà Kem Cheese (M)</li>
        <li>Trà Xanh Kem Cheese (M)</li>
        <li>Ô Long Kem Cheese (M)</li>
      </ul>
      <p>Mỗi ly trà là một hành trình nhỏ, nơi vị và hương hòa quyện, mang lại cảm giá tươi mới và thư giãn trọn vẹn.</p>
      <p>Hôm nay, hẹn nhau ở Hồng Trà Ngô Gia nhé!</p>
      <p>#HongTraNgoGia #2TangVi6LopHuong #BSTMoi #TraXiMuoiNgoGia #TraKemCheeseNgoGia #TraNgonMoiNgay #HongTra #TraSua #CheeseTea #NgoGiaMoment #TasteTheLayer #TronViTronHuong</p>
    `
  },
  
  'blog_2': {
    title: 'Vẹn Tròn Trung Thu – Trọn Vị Ngô Gia',
    heading: 'VẸN TRÒN TRUNG THU – TRỌN VỊ NGÔ GIA',
    subheading: 'Khi ánh trăng tròn không chỉ soi sáng, mà còn gợi hương vị yêu thương.',
    date: '26-31/07/2025',
    thumbnailImage: '/assets/images/blog_3.jpg', 
    image: '/assets/images/blog_3.jpg', 
    headingColor: '#D02222',
    layoutType: 'gallery',
    images: [
      '/assets/images/blog_3.jpg',      
      '/assets/images/blog_3.1.png',    
      '/assets/images/blog_3.1.png'   
    ],
    content: `
      <p>Trung Thu năm nay, Hồng Trà Ngô Gia gửi đến bạn combo "Vẹn Tròn" & "Vẹn Duyên", mang hương vị ngọt lành của mùa trăng và chút ấm áp của những cuộc gặp gỡ. Một chút béo mịn từ kem sữa, một chút thanh mát từ trà, hòa quyện trong niềm vui đoàn viên – giản dị nhưng đong đầy.</p>
      <p>Dù là thưởng trà cùng người thân hay bạn bè, mỗi ngụm đều là lời chúc: "Vị ngọt ở lại, tình trọn vẹn như trăng."</p>
      <p>Nhân dịp Trung thu đong đầy, Ngô gia xin tặng các đồng môn các combo với giá cực yêu thương sau:</p>
      <ul>
        <li>Combo Vẹn Tròn: 1 Trà sữa Đài loan (M) + 1 Bát bảo Ngô gia - 39.000đ</li>
        <li>Combo Tròn Đầy: 1 Trà sữa trân châu đường đen (M) + 1 Bát bảo Ngô gia - 39.000đ</li>
      </ul>
      <p>#HongTraNgoGia #VenTronTrungThu #ComboVenTron #ComboVenDuyen #TraNgonTronVi #TrungThuNgoGia #ViTraYeuThuong #TraSua #HongTra</p>
    `
  },

  'blog_3': {
    title: 'Trà mát - Gấu xinh - Vui hết mình',
    heading: 'TRÀ MÁT - GẤU XINH <br/> VUI HẾT MÌNH',
    date: '06-11/10/2025',
    thumbnailImage: '/assets/images/blog_2.jpg',
    image: '/assets/images/blog_2.jpg',
    headingColor: '#0088ff',
    layoutType: 'single',
    content: `
      <p>Từ 26 – 31/07, Hồng Trà Ngô Gia tung quà phiên bản giới hạn: Túi giữ nhiệt "Gấu" cực cool!</p>
      <ul style="list-style-type: none; padding-left: 0;">
        <li>🎁 Hóa đơn 40K – nhận ngay túi 2 ly</li>
        <li>🎁 Hóa đơn 60K – rước túi 4 ly</li>
      </ul>
      <p>Trà ngon mát lạnh, Gấu xinh đồng hành – chill xuyên ngày hè thôi nào! 💙💚</p>
      <p>#HongTraNgoGia #ChillCungTraThaGauVeNha #TraNgonQuaXinh #PhienBanGioiHan #TraSua #NgoGiaVibes</p>
    `
  },

  'blog_4': {
    title: 'Gửi trao bình an - Lan tỏa yêu thương',
    heading: 'GỬI TRAO BÌNH AN - LAN TỎA YÊU THƯƠNG',
    date: '13-15/06/2025',
    thumbnailImage: '/assets/images/blog_4.jpg',
    image: '/assets/images/blog_4.jpg',
    headingColor: '#305C33',
    layoutType: 'single',
    content: `
      <p>Thưởng thức ly trà mát lành, gửi gắm yêu thương qua từng ngụm nhỏ.</p>
      <p>Từ 25 – 28/09, khi mua từ 3 ly trở lên, bạn sẽ được tặng 01 vòng tay tinh dầu – món quà nhỏ mang lời chúc bình an, giúp bạn thư giãn và thêm năng lượng tích cực mỗi ngày 🌿💫</p>
      <p>Cùng Hồng Trà Ngô Gia lan tỏa yêu thương – vì hạnh phúc đôi khi chỉ bắt đầu từ một ly trà mát lạnh! 💚</p>
      <p>#HongTraNgoGia #GuiTraoBinhAn #VongTayTinhDau #QuaTangYeuThuong #TraSuaNhaLam #TinhDauThienNhien #DrinkAndChill #GiuNhietYeuThuong</p>
    `
  },

  'blog_5': {
    title: 'Ngũ sắc ngũ vị - Hương vị sắc màu',
    heading: 'NGŨ SẮC NGŨ VỊ - HƯƠNG VỊ SẮC MÀU',
    date: '20/07/2025',
    thumbnailImage: '/assets/images/blog_7.jpg',
    image: '/assets/images/blog_7.jpg',
    headingColor: '#0088ff',
    layoutType: 'single',
    content: `
      <p>Từng viên trân châu ngũ sắc lung linh như gom trọn sắc trời – mềm dẻo, ngọt thanh, quyện cùng vị trà mát lành tạo nên hương vị vừa thân quen, vừa mới lạ.</p>
      <p>Một topping nhỏ thôi, nhưng lại đủ khiến ly trà của bạn trở nên đặc biệt hơn bao giờ hết 💚</p>
      <p>Từ 25 – 28/09, Hồng Trà Ngô Gia gửi tặng bạn ưu đãi đặc biệt:</p>
      <p>👉 Trân châu ngũ sắc chỉ 5.000đ – thêm topping, thêm sắc màu, thêm yêu thương!</p>
      <p>Hãy để vị ngọt dẻo của trân châu hòa cùng hương trà thanh khiết, mang lại chút bình yên giữa những ngày đầy nắng 🌞</p>
      <p>Vì đôi khi, hạnh phúc đơn giản chỉ là… một ly trà mát lành và chút sắc màu khiến lòng vui hơn 🍃</p>
      <p>#HongTraNgoGia #TranChauNguSac #NguSacNguVi #TraSuaNgoGia #UuDai5k #TraSuaNgon #TraSuaNhaLam #DrinkAndChill #GiuNhietYeuThuong</p>
    `
  },

  'blog_6': {
    title: 'Nhâm nhi trà ngon - Nhận ngay khóa xinh',
    heading: 'NHÂM NHI TRÀ NGON <br/> NHẬN NGAY KHÓA XINH',
    date: '28-29/08/2025',
    thumbnailImage: '/assets/images/blog_6.jpg',
    image: '/assets/images/blog_6.jpg',
    headingColor: '#0088ff',
    layoutType: 'single',
    content: `
      <p>Mỗi ly trà là một niềm vui, và mỗi chiếc móc khóa xinh lại là một món quà nhỏ lưu giữ khoảnh khắc đáng nhớ cùng Ngô Gia 💫</p>
      <p>Từ 28 – 29/08/2025, khi hóa đơn của bạn trên 70.000đ,</p>
      <p>Ngô Gia gửi tặng 01 móc khóa phiên bản mini cực đáng yêu – có đủ sắc màu để bạn lựa chọn và "mix match" theo cá tính riêng 💕</p>
      <p>🍹 Vừa nhâm nhi trà ngon, vừa mang về một chiếc móc khóa dễ thương – còn gì bằng!</p>
      <p>Nhanh chân ghé Hồng Trà Ngô Gia để sưu tập trọn bộ khóa xinh và tận hưởng vị trà yêu thích nhé 💚</p>
      <p>#HongTraNgoGia #KhoaXinhNgoGia #NhamNhiTraNgon #UongTraNhanQua #TraSuaNgoGia #TraNgonQuaXinh #DrinkAndChill #GiuNhietYeuThuong</p>
    `
  },

  'blog_7': {
    title: 'Chúc mừng ngày phụ nữ Việt Nam 20.10.2025',
    heading: 'CHÚC MỪNG NGÀY <br/> PHỤ NỮ VIỆT NAM 20.10.2025',
    date: '20/10/2025',
    thumbnailImage: '/assets/images/blog_5.jpg',
    image: '/assets/images/blog_5.jpg',
    headingColor: '#ff94b2',
    layoutType: 'single',
    content: `
      <p>Ngày 20/10, Hồng Trà Ngô Gia gửi đến một nửa yêu thương của thế giới lời chúc ngọt ngào nhất 🌷</p>
      <p>Chúc các cô gái của Ngô Gia luôn xinh đẹp – tự tin – và tỏa hương như chính ly trà bạn yêu thích mỗi ngày.</p>
      <p>Một ly trà thay lời chúc, một nụ cười thay ngàn điều muốn nói 💕</p>
      <p>Hôm nay, hãy tự thưởng cho mình một chút "ngọt ngào" và gửi tặng người phụ nữ bạn thương những ly trà tràn đầy yêu thương nhé 🍹</p>
      <p>#HongTraNgoGia #20Thang10 #NgayPhuNuVietNam #TraSuaNgoGia #GuiTraoYeuThuong #NuCuoiNgoGia #TraNgonTinhYeuThemNong</p>
    `
  },

  'blog_8': {
    title: 'Mừng ngày của cha cùng Hồng Trà Ngô Gia',
    heading: 'MỪNG NGÀY CỦA CHA <br/> CÙNG HỒNG TRÀ NGÔ GIA BẠN NHÉ!',
    date: '08/08/2025',
    thumbnailImage: '/assets/images/blog_8.jpg',
    image: '/assets/images/blog_8.jpg',
    headingColor: '#0088ff',
    layoutType: 'single',
    content: `
      <p>Bàn tay cha không mềm mại như mẹ, nhưng là bàn tay đã che chở và nâng bước chúng ta suốt hành trình khôn lớn.</p>
      <p>Ngày của Cha năm nay, Hồng Trà Ngô Gia gửi lời tri ân đến những người đàn ông thầm lặng – những "người hùng" trong mái ấm nhỏ.</p>
      <p>Hãy cùng Ngô Gia nhâm nhi một ly trà đậm vị, để cảm nhận sự ấm áp và vững chãi như tình yêu của cha 🍵</p>
      <p>👉 Dành tặng Cha một ly trà yêu thích – vì đôi khi, "bình yên" chỉ đơn giản là cùng nhau thưởng trà.</p>
      <p>#HongTraNgoGia #FathersDay #NgayCuaCha #TraSuaNgoGia #TraTinhYeu #GuiTraoYeuThuong #TraDaiLoan #CamOnCha</p>
    `
  }
};

export const RELATED_BLOGS = [
  { 
    id: 'blog_1', 
    image: '/assets/images/blog_1.jpg', 
    date: '03/09/2025', 
    title: 'Kem Cheese & Xí Muội', 
    description: 'Bộ đôi khuấy đảo các tầng vị đầy mới mẻ', 
    link: '/src/Pages/Blog/blog-detail.html?id=blog_1' 
  },
  { 
    id: 'blog_2', 
    image: '/assets/images/blog_3.jpg',
    date: '06/10/2025', 
    title: 'Vẹn Tròn Trung Thu', 
    description: 'Thức uống dịu mát cho mùa lễ hội đoàn viên 2025', 
    link: '/src/Pages/Blog/blog-detail.html?id=blog_2' 
  },
  { 
    id: 'blog_3', 
    image: '/assets/images/blog_2.jpg', 
    date: '26/07/2025', 
    title: 'Trà mát - Gấu xinh', 
    description: 'Săn "Gấu" - Tặng túi giữ nhiệt phiên bản giới hạn', 
    link: '/src/Pages/Blog/blog-detail.html?id=blog_3' 
  },
  { 
    id: 'blog_4', 
    image: '/assets/images/blog_4.jpg', 
    date: '26/09/2025', 
    title: 'Gửi trao bình an', 
    description: 'Mua 3 ly nhận vòng tay tinh dầu', 
    link: '/src/Pages/Blog/blog-detail.html?id=blog_4' 
  },
  { 
    id: 'blog_5', 
    image: '/assets/images/blog_7.jpg', 
    date: '20/07/2025', 
    title: 'Trân châu ngũ sắc', 
    description: 'Ngũ sắc ngũ vị - Hương vị sắc màu', 
    link: '/src/Pages/Blog/blog-detail.html?id=blog_5' 
  },
  { 
    id: 'blog_6', 
    image: '/assets/images/blog_6.jpg', 
    date: '28/08/2025', 
    title: 'Nhận ngay khóa xinh', 
    description: 'Nhâm nhi trà ngon - Móc khóa mini đáng yêu', 
    link: '/src/Pages/Blog/blog-detail.html?id=blog_6' 
  },
  { 
    id: 'blog_7', 
    image: '/assets/images/blog_5.jpg', 
    date: '20/10/2025', 
    title: 'Ngày Phụ Nữ Việt Nam', 
    description: 'Chúc mừng ngày phụ nữ Việt Nam 20.10', 
    link: '/src/Pages/Blog/blog-detail.html?id=blog_7' 
  },
  { 
    id: 'blog_8', 
    image: '/assets/images/blog_8.jpg', 
    date: '20/10/2025', 
    title: 'Ngày của cha', 
    description: 'Mừng ngày của cha cùng Hồng Trà Ngô Gia', 
    link: '/src/Pages/Blog/blog-detail.html?id=blog_8' 
  },
  { 
    id: 'blog_9', 
    image: '/assets/images/blog_9.jpg', 
    date: '10/02/2026', 
    title: 'Nhân đôi ngọt ngào ngày Valentine', 
    description: 'Combo 2 thức uống ngọt ngào – giá chỉ 42.000đ', 
    link: '/src/Pages/Blog/blog-detail.html?id=blog_9' 
  },
  { 
    id: 'blog_10', 
    image: '/assets/images/blog_10.jpg', 
    date: '01/01/2026', 
    title: 'Khởi vị đầu năm', 
    description: 'Hóa đơn từ 33.000đ – tặng 1 ly Hồng Trà Đài Loan (M)', 
    link: '/src/Pages/Blog/blog-detail.html?id=blog_10' 
  },
  { 
    id: 'blog_11', 
    image: '/assets/images/blog_11.jpg', 
    date: '01/01/2026', 
    title: 'Khởi vị đầu năm cùng Hồng Trà Ngô Gia', 
    description: 'Ưu đãi năm mới – tặng Hồng Trà Đài Loan', 
    link: '/src/Pages/Blog/blog-detail.html?id=blog_11' 
  },
  { 
    id: 'blog_12', 
    image: '/assets/images/blog_12.jpg', 
    date: '08/11/2025', 
    title: 'Dù nắng hay mưa – Ngô Gia luôn bên bạn', 
    description: 'Tặng áo mưa tiện lợi cho hóa đơn từ 2 thức uống', 
    link: '/src/Pages/Blog/blog-detail.html?id=blog_12' 
  },
  { 
    id: 'blog_13', 
    image: '/assets/images/blog_13.jpg', 
    date: '28/08/2025', 
    title: 'Săn móc khóa Ngô Gia phiên bản siêu giới hạn', 
    description: 'Hóa đơn từ 70.000đ – nhận ngay móc khóa cực đáng yêu', 
    link: '/src/Pages/Blog/blog-detail.html?id=blog_13' 
  },
  { 
    id: 'blog_14', 
    image: '/assets/images/blog_14.jpg', 
    date: '26/07/2025', 
    title: 'Rinh túi giữ nhiệt siêu cute', 
    description: 'Hóa đơn từ 40K – túi 2 ly / từ 60K – túi 4 ly', 
    link: '/src/Pages/Blog/blog-detail.html?id=blog_14' 
  },
  { 
    id: 'blog_15', 
    image: '/assets/images/blog_15.png', 
    date: '20/01/2026', 
    title: 'Tuyển dụng nhân viên thiết kế', 
    description: 'Graphic Designer – Mức lương từ 9.500.000 VNĐ/tháng', 
    link: '/src/Pages/Blog/blog-detail.html?id=blog_15' 
  }
];