import {
    ArrowDownLeft, ArrowUpRight, Ban, Banknote, Calendar, Car, Check, ChevronDown, ChevronLeft, ChevronRight,
    Circle, CircleCheck, Clock, Eye, EyeOff, Flag, Gamepad2, GraduationCap, Heart, HeartPulse, History, House,
    Inbox, LayoutDashboard, LogIn, LogOut, Monitor, Moon, Ellipsis, Pencil, PartyPopper, PieChart, PiggyBank,
    Plus, Receipt, RefreshCw, Search, Shapes, ShoppingBag, Sun, Tags, Trash2, TriangleAlert, User, Utensils,
    Wallet, X, type LucideIcon, type LucideProps,
} from 'lucide-react';

/**
 * Icons are referenced by Material Symbols names because category icons are
 * stored that way in Firestore ("restaurant Ăn uống"). Unknown names render a
 * neutral circle instead of leaking the name as text.
 */
const ICONS: Record<string, LucideIcon> = {
    // Categories (current + legacy stored names)
    restaurant: Utensils,
    fastfood: Utensils,
    directions_car: Car,
    local_mall: ShoppingBag,
    shopping_bag: ShoppingBag,
    sports_esports: Gamepad2,
    favorite: Heart,
    local_hospital: HeartPulse,
    school: GraduationCap,
    home: House,
    attach_money: Banknote,
    category: Shapes,
    more_horiz: Ellipsis,
    block: Ban,
    pending_actions: Clock,

    // App chrome
    dashboard: LayoutDashboard,
    classify: Tags,
    history: History,
    analytics: PieChart,
    more: Ellipsis,
    finance: PiggyBank,
    savings: PiggyBank,
    sync: RefreshCw,
    wallet: Wallet,
    flag: Flag,
    light_mode: Sun,
    dark_mode: Moon,
    system_mode: Monitor,
    login: LogIn,
    logout: LogOut,
    back: ChevronLeft,
    chevron_right: ChevronRight,
    expand_more: ChevronDown,
    close: X,
    add: Plus,
    edit: Pencil,
    delete: Trash2,
    search: Search,
    calendar: Calendar,
    schedule: Clock,
    check: Check,
    check_circle: CircleCheck,
    celebration: PartyPopper,
    receipt: Receipt,
    inbox: Inbox,
    income: ArrowDownLeft,
    expense: ArrowUpRight,
    person: User,
    visibility: Eye,
    visibility_off: EyeOff,
    warning: TriangleAlert,
};

interface IconProps extends Omit<LucideProps, 'ref'> {
    name: string;
}

export default function Icon({ name, size = 20, strokeWidth = 2, ...rest }: IconProps) {
    const Cmp = ICONS[name] ?? Circle;
    return <Cmp size={size} strokeWidth={strokeWidth} aria-hidden="true" {...rest} />;
}
