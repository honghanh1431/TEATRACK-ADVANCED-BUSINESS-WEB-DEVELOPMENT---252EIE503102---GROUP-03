export const ROUTE_TITLES: Record<string, string> = {
  '/': 'Trang chủ',
  '/blog': 'Diễn đàn',
  '/blog/:id': 'Chi tiết bài viết',
  '/menu': 'Menu thức uống',
  '/menu/product/:id/:name': 'Chi tiết sản phẩm',
  '/product': 'Chi tiết sản phẩm',
  '/contact': 'Liên hệ',
  '/aboutus': 'Về chúng tôi',
  '/cart': 'Giỏ hàng',
  '/agency': 'Chi nhánh',
  '/login': 'Đăng nhập',
  '/register': 'Đăng ký',
  '/order-history': 'Lịch sử đơn hàng',
  '/profile': 'Hồ sơ',
  '/profile#profile':'Thông tin cá nhân',
  '/profile#security':'Tài khoản & bảo mật',
  '/profile#policy':'Chính sách & điều khoản',
  '/profile#support':'Trung tâm trợ giúp',
  '/order-tracking': 'Theo dõi đơn hàng',
  '/forgot-password': 'Quên mật khẩu',
};

export const ROUTE_TITLES_I18N: Record<string, { vi: string; en: string }> = {
  '/forgot-password': { vi: 'Quên mật khẩu', en: 'Forgot password' },
};

export type RouteTitleLang = 'vi' | 'en';

export function getRouteTitle(path: string, lang: RouteTitleLang = 'vi'): string {
  const i18n = ROUTE_TITLES_I18N[path];
  if (i18n) return i18n[lang];
  return ROUTE_TITLES[path] ?? '';
}

export const APP_TITLE_SUFFIX = 'Hồng Trà Ngô Gia';
