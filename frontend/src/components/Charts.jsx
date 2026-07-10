import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';

export const TrendChart = ({ data = [], height = 260 }) => (
  <ResponsiveContainer width="100%" height={height}>
    <AreaChart data={data} margin={{ top: 10, right: 15, left: -20, bottom: 0 }}>
      <defs>
        <linearGradient id="ideasGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor="#2563eb" stopOpacity={0.28} />
          <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
        </linearGradient>
        <linearGradient id="votesGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.25} />
          <stop offset="95%" stopColor="#14b8a6" stopOpacity={0} />
        </linearGradient>
      </defs>
      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
      <XAxis dataKey="date" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
      <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
      <Tooltip />
      <Legend iconType="circle" />
      <Area type="monotone" dataKey="ideas" stroke="#2563eb" strokeWidth={2} fill="url(#ideasGradient)" />
      <Area type="monotone" dataKey="votes" stroke="#14b8a6" strokeWidth={2} fill="url(#votesGradient)" />
      <Area type="monotone" dataKey="comments" stroke="#8b5cf6" strokeWidth={2} fill="transparent" />
    </AreaChart>
  </ResponsiveContainer>
);

export const CategoryDonut = ({ data = [], height = 260 }) => (
  <ResponsiveContainer width="100%" height={height}>
    <PieChart>
      <Tooltip />
      <Pie data={data} dataKey="value" nameKey="name" innerRadius={58} outerRadius={92} paddingAngle={2}>
        {data.map((entry, index) => <Cell key={entry.name} fill={entry.color || ['#2563eb', '#16a34a', '#f59e0b', '#dc2626', '#7c3aed', '#0f766e'][index % 6]} />)}
      </Pie>
      <Legend iconType="circle" layout="vertical" align="right" verticalAlign="middle" />
    </PieChart>
  </ResponsiveContainer>
);

export const MonthlyBars = ({ data = [], height = 260 }) => (
  <ResponsiveContainer width="100%" height={height}>
    <BarChart data={data} margin={{ top: 10, right: 15, left: -20, bottom: 0 }}>
      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
      <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
      <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
      <Tooltip />
      <Bar dataKey="ideas" fill="#2563eb" radius={[4, 4, 0, 0]} />
    </BarChart>
  </ResponsiveContainer>
);
