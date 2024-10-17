'use client'

import { useState, useEffect, useRef, useCallback, SetStateAction } from 'react'
import { Filter, Home, User, Settings, Star, Clock, ChevronRight, Search, X, ArrowLeft, Heart, Camera, Upload } from 'lucide-react'
import { sha256 } from 'js-sha256'
import axios from 'axios';
import { headers } from 'next/headers';
import { debounce } from 'lodash'; // 需要安装 lodash 库

// 创建一个 axios 实例
const api = axios.create({
  baseURL: 'http://localhost:3000/api'
});

// 添加请求拦截器
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = token;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// API helper function (模拟API调用)
const apiCall = async (url: string, method = 'GET', body: any = null, token: string | null = null) => {
  console.log(`API调用: ${method} ${url}`, body, token)
  // 模拟API调用延迟
  await new Promise(resolve => setTimeout(resolve, 500))
  // 返回模拟数据
  return { success: true, data: {} }
}

// 定义 Classification 类型
type Classification = {
  [key: string]: {
    unicode: string;
    childs: Classification;
  };
};

// 定义 Artifact 类型
type Artifact = {
  pid: string;
  url: string;
  title: string;
};

// 在文件顶部添加这些类型定义
type Params = {
  c0: string;
  c1: string;
  c2: string;
  c3: string;
  c4: string;
  c5: string;
  page: number;
  limit: number;
};

// 在文件顶部添加新的类型定义
type PageStack = {
  database: string[];
  identify: string[];
  profile: string[];
};

// Header Component
const Header = ({ isLoggedIn, onLoginClick, showBackButton = false, onBackClick, title = "文物数据库" }: {
  isLoggedIn: boolean;
  onLoginClick: () => void;
  showBackButton?: boolean;
  onBackClick?: () => void;
  title?: string;
}) => (
  <header className="flex justify-between items-center p-4 bg-white border-b border-gray-200">
    {showBackButton ? (
      <button onClick={onBackClick} className="text-red-700">
        <ArrowLeft className="w-6 h-6" />
      </button>
    ) : (
      <h1 className="text-xl font-bold text-gray-800">{title}</h1>
    )}
    <div className="flex items-center">
      <button className="text-red-700 mr-4">
        <Search className="w-6 h-6" />
      </button>
      {!isLoggedIn && (
        <button onClick={onLoginClick} className="text-red-700">
          <User className="w-6 h-6" />
        </button>
      )}
    </div>
  </header>
)

// Navigation Component
const Navigation = ({ activeCategory, onCategoryChange, onFilterClick, classification }: {
  activeCategory: string;
  onCategoryChange: (category: string) => void;
  onFilterClick: () => void;
  classification: Record<string, { unicode: string; childs: any }>;
}) => {
  const defaultCategories = ['古币', '珍宝', '陶瓷', '书画'];
  const classificationCategories = Object.values(classification).map(item => item.unicode);
  const categories = classificationCategories.length >= defaultCategories.length 
    ? classificationCategories 
    : [...classificationCategories, ...defaultCategories.slice(classificationCategories.length)];

  return (
    <nav className="flex items-center p-2 bg-white border-b border-gray-200">
      <button
        className="p-2 text-red-700 mr-2"
        onClick={onFilterClick}
      >
        <Filter className="w-6 h-6" />
      </button>
      <div className="flex overflow-x-auto whitespace-nowrap">
        {categories.map((category) => (
          <button
            key={category}
            className={`px-3 py-2 text-sm font-medium ${category === activeCategory ? 'text-red-700 border-b-2 border-red-700' : 'text-gray-600'}`}
            onClick={() => onCategoryChange(category)}
          >
            {category}
          </button>
        ))}
      </div>
    </nav>
  )
}

// Filter Popover Component
const FilterPopover = ({ isOpen, onClose, onFilterChange, classification }: {
  isOpen: boolean;
  onClose: () => void;
  onFilterChange: (filter: string[]) => void;
  classification: Classification;
}) => {
  const [step, setStep] = useState(0);
  const [selections, setSelections] = useState<string[]>(['', '', '', '', '', '']);

  useEffect(() => {
    if (isOpen) {
      setStep(0);
      setSelections(['', '', '', '', '', '']);
    }
  }, [isOpen]);

  const handleSelection = (selection: string, level: number) => {
    const newSelections = [...selections];
    newSelections[level] = selection;
    newSelections.fill('', level + 1); // 清空后续选择
    setSelections(newSelections);
    onFilterChange(newSelections); // 每次选择后立即触发筛选
    
    let currentLevel = classification;
    for (let i = 0; i <= level; i++) {
      if (currentLevel[newSelections[i]]) {
        currentLevel = currentLevel[newSelections[i]].childs;
      } else {
        currentLevel = {};
        break;
      }
    }

    if (Object.keys(currentLevel).length === 0 || level === 5) {
      onClose();
    } else {
      setStep(level + 1);
    }
  }

  const renderStepContent = () => {
    let currentLevel = classification;
    for (let i = 0; i < step; i++) {
      if (currentLevel[selections[i]]) {
        currentLevel = currentLevel[selections[i]].childs;
      } else {
        return null;
      }
    }

    return Object.entries(currentLevel).map(([key, value]) => (
      <button
        key={key}
        className="px-3 py-1 text-sm text-gray-700 hover:bg-red-50 rounded"
        onClick={() => handleSelection(key, step)}
      >
        {value.unicode}
      </button>
    ));
  }

  const getSelectionPath = () => {
    let currentLevel = classification;
    return selections.filter(Boolean).map((selection, index) => {
      const unicode = currentLevel[selection]?.unicode || '';
      currentLevel = currentLevel[selection]?.childs || {};
      return unicode;
    }).join(' - ');
  }

  if (!isOpen) return null;

  return (
    <div className="absolute top-full left-0 mt-2 bg-white rounded-lg shadow-lg p-4 w-64 z-50">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold">筛选</h2>
        <button onClick={onClose}>
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="mb-4">
        <p className="text-sm font-medium text-gray-700 mb-2">
          {getSelectionPath()}
        </p>
        <div className="flex flex-wrap gap-2">
          {renderStepContent()}
        </div>
      </div>
    </div>
  )
}

// Profile Header Component
const ProfileHeader = ({ username, userId, isLoggedIn, onLoginClick }: { 
  username?: string; 
  userId?: string; 
  isLoggedIn: boolean; 
  onLoginClick: () => void 
}) => (
  <div className="relative h-48 bg-gradient-to-b from-red-700 to-red-800 flex items-end">
    <div className="absolute bottom-0 left-0 right-0 flex items-end p-4">
      <div className="w-16 h-16 rounded-full bg-white border-4 border-white overflow-hidden">
        {isLoggedIn ? (
          <img src={`http://ui-avatars.com/api/?name=${encodeURIComponent(username || '')}`} alt="Profile" className="w-full h-full object-cover" />
        ) : (
          <User className="w-full h-full text-gray-400" />
        )}
      </div>
      <div className="ml-4 mb-1 flex-grow">
        {isLoggedIn ? (
          <>
            <h2 className="text-xl font-bold text-white">{username}</h2>
            <p className="text-xs text-red-100">用户ID: {userId}</p>
          </>
        ) : (
          <button 
            onClick={onLoginClick} 
            className="px-4 py-2 bg-white text-red-700 rounded-full font-medium"
          >
            请登录
          </button>
        )}
      </div>
    </div>
  </div>
)

// Profile Menu Item Component
const ProfileMenuItem = ({ icon, title, onClick, disabled = false }: { icon: React.ReactNode; title: string; onClick: () => void; disabled?: boolean }) => (
  <div 
    className={`flex items-center justify-between p-4 border-b border-gray-200 ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`} 
    onClick={disabled ? undefined : onClick}
  >
    <div className="flex items-center">
      {icon}
      <span className="ml-4 text-gray-700">{title}</span>
    </div>
    <ChevronRight className="w-5 h-5 text-gray-400" />
  </div>
)

// Artifact Card Component
const ArtifactCard = ({ id, image, title, subtitle, onClick }: {
  id: string;
  image: string;
  title: string;
  subtitle: string;
  onClick: (id: string) => void;
}) => (
  <div className="bg-white rounded-lg shadow-md overflow-hidden cursor-pointer" onClick={() => onClick(id)}>
    <div className="aspect-square bg-gray-200 mb-2">
      <img src={image || "/placeholder.svg?height=200&width=200"} alt={title} className="w-full h-full object-cover" />
    </div>
    <div className="p-2">
      <h3 className="text-sm font-medium truncate text-gray-800">{title}</h3>
      <p className="text-xs text-gray-500">{subtitle}</p>
    </div>
  </div>
)

// Artifact Grid Component
const ArtifactGrid = ({ filter, onArtifactClick, artifacts, loading, hasMore, setPage, lastArtifactElementRef }: {
  filter: string[];
  onArtifactClick: (pid: string) => void;
  artifacts: Artifact[];
  loading: boolean;
  hasMore: boolean;
  setPage: React.Dispatch<SetStateAction<number>>;
  lastArtifactElementRef: (node: HTMLDivElement | null) => void;
}) => {
  return (
    <div className="grid grid-cols-2 gap-4 p-4">
      {artifacts.map((artifact, index) => (
        <div
          key={artifact.pid}
          ref={index === artifacts.length - 1 ? lastArtifactElementRef : null}
        >
          <ArtifactCard
            id={artifact.pid}
            image={artifact.url}
            title={artifact.title}
            subtitle=""
            onClick={onArtifactClick}
          />
        </div>
      ))}
      {loading && <p className="col-span-2 text-center text-gray-500">加载中...</p>}
      {!hasMore && artifacts.length > 0 && <p className="col-span-2 text-center text-gray-500">没有更多数据了</p>}
      {!loading && artifacts.length === 0 && <p className="col-span-2 text-center text-gray-500">没有找到相关文物</p>}
    </div>
  );
};

// Bottom Navigation Component
const BottomNav = ({ activePage, onPageChange }: { activePage: string, onPageChange: (page: string) => void }) => (
  <nav className="fixed bottom-0 left-0 right-0 flex justify-around items-end bg-white border-t border-gray-200 p-2">
    <button
      className={`flex flex-col items-center ${activePage === 'database' ? 'text-red-700' : 'text-gray-600'}`}
      onClick={() => onPageChange('database')}
    >
      <Home className="w-6 h-6" />
      <span className="text-xs">数据库</span>
    </button>
    <button
      className="flex flex-col items-center relative -top-2" 
      onClick={() => onPageChange('identify')}
    >
      <div className="w-[70px] h-[70px] rounded-full bg-red-700 flex items-center justify-center text-white absolute bottom-0">
        识别
      </div>
    </button>
    <button
      className={`flex flex-col items-center ${activePage === 'profile' ? 'text-red-700' : 'text-gray-600'}`}
      onClick={() => onPageChange('profile')}
    >
      <User className="w-6 h-6" />
      <span className="text-xs">我的</span>
    </button>
  </nav>
)

// Login Component
const Login = ({ onLogin, onSwitchToRegister }: { onLogin: (username: string, password: string) => Promise<void>, onSwitchToRegister: () => void }) => {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    try {
      await onLogin(username, password)
      setSuccess('登录成功')
      setTimeout(() => setSuccess(''), 500)
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败，请重试')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-96">
        <h2 className="text-2xl font-bold mb-6 text-center">登录</h2>
        {error && <p className="text-red-500 text-sm mb-4 animate-fade-in">{error}</p>}
        {success && <p className="text-green-500 text-sm mb-4 animate-fade-in">{success}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700">用户名</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">密码</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
            />
          </div>
          <button
            type="submit"
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            登录
          </button>
        </form>
        <div className="mt-4 text-center">
          <button onClick={onSwitchToRegister} className="text-sm text-red-600 hover:text-red-500">
            还没有账号？注册
          </button>
        </div>
      </div>
    </div>
  )
}

// Register Component
const Register = ({ onRegister, onSwitchToLogin }: { onRegister: (username: string, password: string) => Promise<void>, onSwitchToLogin: () => void }) => {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [r_password, setRPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    if (password !== r_password) {
      setError('密码不匹配')
      return
    }
    try {
      await onRegister(username, password)
      setSuccess('注册成功')
      setTimeout(() => setSuccess(''), 500)
    } catch (err) {
      setError(err instanceof Error ? err.message : '注册失败，请重试')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-96">
        <h2 className="text-2xl font-bold mb-6 text-center">注册</h2>
        {error && <p className="text-red-500 text-sm mb-4 animate-fade-in">{error}</p>}
        {success && <p className="text-green-500 text-sm mb-4 animate-fade-in">{success}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700">用户</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">密码</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
            />
          </div>
          <div>
            <label htmlFor="r_password" className="block text-sm font-medium text-gray-700">确认密码</label>
            <input
              type="password"
              id="r_password"
              value={r_password}
              onChange={(e) => setRPassword(e.target.value)}
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
            />
          </div>
          <button
            type="submit"
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
          注册
          </button>
        </form>
        <div className="mt-4 text-center">
          <button onClick={onSwitchToLogin} className="text-sm text-red-600 hover:text-red-500">
            已有账号？登录
          </button>
        </div>
      </div>
    </div>
  )
}

// Detail Page Component 详细页面组件
const DetailPage = ({ pid, onBack, showToast }: { pid: string, onBack: () => void, showToast: (message: string, type: 'success' | 'error') => void }) => {
  const [artifact, setArtifact] = useState<{
    pid: string;
    img: string;
    title: string;
    text: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFavorited, setIsFavorited] = useState(false);

  const recordHistory = useCallback(
    debounce(async (pid: string) => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          await axios.post('http://localhost:3000/api/user-actions/record', { pid: pid, timestamp: Date.now() }, {
            headers: { Authorization: token }
          });
        } catch (error) {
          console.error('Failed to record history:', error);
        }
      }
    }, 1000), // 1秒内的多次调用只会执行一次
    []
  );

  useEffect(() => {
    const fetchArtifact = async () => {
      try {
        const response = await axios.get(`http://localhost:3000/api/artifacts/search?id=${pid}`);
        const data = response.data;
        setArtifact(data);
        // 记录浏览历史
        recordHistory(pid);
        
        // 检查是否已收藏
        const favoriteResponse = await api.get('/user-actions/favorite');
        const favorites = favoriteResponse.data;
        setIsFavorited(favorites.some((fav: { pid: string }) => fav.pid === pid));
      } catch (error) {
        console.error('Failed to fetch artifact details:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchArtifact();
  }, [pid, recordHistory]);

  const handleFavorite = async () => {
    try {
      if (isFavorited) {
        await api.delete('/user-actions/favorite', { data: { pid } });
        setIsFavorited(false);
        showToast('已取消收藏', 'success');
      } else {
        await api.post('/user-actions/favorite', { pid });
        setIsFavorited(true);
        showToast('已添加到收藏', 'success');
      }
    } catch (error) {
      console.error('Failed to update favorite:', error);
      showToast('操作失败，请重试', 'error');
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-screen">加载中...</div>;
  }

  if (!artifact) {
    return <div className="flex justify-center items-center h-screen">未找到文物信息</div>;
  }

  return (
    <div className="min-h-screen bg-white">
      <Header showBackButton={true} onBackClick={onBack} title={artifact.title} isLoggedIn={false} onLoginClick={() => {}} />
      <div className="p-4">
        <img src={artifact.img} alt={artifact.title} className="w-full h-64 object-cover rounded-lg mb-4" />
        <h2 className="text-2xl font-bold mb-2">{artifact.title}</h2>
        <p className="text-gray-600 mb-4">{artifact.text}</p>
        <button
          onClick={handleFavorite}
          className={`flex items-center justify-center w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
            isFavorited ? 'bg-gray-600 hover:bg-gray-700' : 'bg-red-600 hover:bg-red-700'
          } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500`}
        >
          <Heart className={`w-5 h-5 mr-2 ${isFavorited ? 'fill-current' : ''}`} />
          {isFavorited ? '取消收藏' : '加入收藏'}
        </button>
      </div>
    </div>
  );
}

// History Page Component
const HistoryPage = ({ onBack, onArtifactClick }: { onBack: () => void, onArtifactClick: (pid: string) => void }) => {
  const [history, setHistory] = useState<Array<{id: string, pid: string, url: string, title: string, timestamp: number}>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await api.get('/user-actions/history');
        const historyData = response.data;
        const detailedHistory = await Promise.all(historyData.map(async (item: {id: string, pid: string, timestamp: number}) => {
          const artifactResponse = await api.get(`/artifacts/search?id=${item.pid}`);
          return {
            id: item.id,
            pid: item.pid,
            url: artifactResponse.data.img,
            title: artifactResponse.data.title,
            timestamp: item.timestamp
          };
        }));
        setHistory(detailedHistory);
      } catch (error) {
        console.error('Failed to fetch history:', error);
        setHistory([]);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  const handleArtifactClick = (pid: string) => {
    onArtifactClick(pid);
  };

  return (
    <div className="min-h-screen bg-white">
      <Header showBackButton={true} onBackClick={onBack} title="浏览历史" isLoggedIn={true} onLoginClick={() => {}} />
      <div className="p-4">
        {loading ? (
          <p className="text-center text-gray-600">加载中...</p>
        ) : history.length === 0 ? (
          <p className="text-center text-gray-600">暂无浏览历史</p>
        ) : (
          <ul className="divide-y divide-gray-200">
            {history.map((item) => (
              <li key={item.id} className="py-4 cursor-pointer" onClick={() => handleArtifactClick(item.pid)}>
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    <img className="h-12 w-12 rounded-md" src={item.url} alt={item.title} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{item.title}</p>
                    <p className="text-sm text-gray-500">{new Date(item.timestamp).toLocaleString()}</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

// FavoritesPage Component
const FavoritesPage = ({ onBack, onArtifactClick, showToast }: { onBack: () => void, onArtifactClick: (pid: string) => void, showToast: (message: string, type: 'success' | 'error') => void }) => {
  const [favorites, setFavorites] = useState<Array<{id: string, pid: string, url: string, title: string}>>([]);
  const [loading, setLoading] = useState(true);

  const fetchFavorites = useCallback(async () => {
    try {
      const response = await api.get('/user-actions/favorite');
      const favoritesData = response.data;
      const detailedFavorites = await Promise.all(favoritesData.map(async (fav: {id: string, pid: string}) => {
        const artifactResponse = await api.get(`/artifacts/search?id=${fav.pid}`);
        return {
          id: fav.id,
          pid: fav.pid,
          url: artifactResponse.data.img,
          title: artifactResponse.data.title
        };
      }));
      setFavorites(detailedFavorites);
    } catch (error) {
      console.error('Failed to fetch favorites:', error);
      showToast('获取收藏失败', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  const handleRemoveFavorite = async (pid: string) => {
    try {
      await api.delete('/user-actions/favorite', { data: { pid } });
      showToast('已从收藏中移除', 'success');
      fetchFavorites(); // 重新获取收藏列表
    } catch (error) {
      console.error('Failed to remove favorite:', error);
      showToast('移除收藏失败', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <Header showBackButton={true} onBackClick={onBack} title="我的收藏" isLoggedIn={true} onLoginClick={() => {}} />
      <div className="p-4">
        {loading ? (
          <p className="text-center text-gray-600">加载中...</p>
        ) : favorites.length === 0 ? (
          <p className="text-center text-gray-600">暂无收藏</p>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {favorites.map((favorite) => (
              <div key={favorite.id} className="relative">
                <div 
                  className="cursor-pointer"
                  onClick={() => onArtifactClick(favorite.pid)}
                >
                  <img src={favorite.url} alt={favorite.title} className="w-full h-40 object-cover rounded-lg" />
                  <p className="mt-2 text-sm font-medium text-gray-900 truncate">{favorite.title}</p>
                </div>
                <button
                  onClick={() => handleRemoveFavorite(favorite.pid)}
                  className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-1 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Toast 组件
const Toast = ({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    const timer = setTimeout(() => {
      setIsLeaving(true);
      setTimeout(onClose, 500); // 等待退出动画完成后关闭
    }, 1500); // 显示时 = 下落时间(500ms) + 停留时间(1000ms)

    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div 
      className={`
        fixed top-0 left-1/2 transform -translate-x-1/2 mt-4 p-4 rounded-md shadow-md 
        ${type === 'success' ? 'bg-green-500' : 'bg-red-700'} text-white
        transition-all duration-500 ease-in-out
        ${isVisible ? (isLeaving ? '-translate-y-full opacity-0' : 'translate-y-0 opacity-100') : '-translate-y-full opacity-0'}
      `}
    >
      <div className="flex items-center">
        <span>{message}</span>
        <button onClick={() => setIsLeaving(true)} className="ml-2">
          <X size={18} />
        </button>
      </div>
    </div>
  );
};

// IdentifyPage 组件
const IdentifyPage = () => {
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [identifyResult, setIdentifyResult] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        })
        .catch(error => console.error("摄像头访问失败:", error));
    }
  }, []);

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const aspectRatio = 1.2;
      
      let cropWidth = video.videoWidth;
      let cropHeight = video.videoWidth * aspectRatio;
      
      // 如果计算出的高度大于视频高度，则以视频高度为基准
      if (cropHeight > video.videoHeight) {
        cropHeight = video.videoHeight;
        cropWidth = video.videoHeight / aspectRatio;
      }
      
      // 设置canvas大小为裁剪尺寸
      canvas.width = cropWidth;
      canvas.height = cropHeight;
      
      const context = canvas.getContext('2d');
      if (context) {
        // 计算裁剪区域的起始坐标（居中裁剪）
        const sx = (video.videoWidth - cropWidth) / 2;
        const sy = (video.videoHeight - cropHeight) / 2;
        
        // 在canvas上绘制裁剪后的图像
        context.drawImage(video, sx, sy, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
        const imageDataUrl = canvas.toDataURL('image/jpeg');
        setCapturedImage(imageDataUrl);
      }
    }
  };

  const handleUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const aspectRatio = 1.2;
          
          let cropWidth = img.width;
          let cropHeight = img.width * aspectRatio;
          
          if (cropHeight > img.height) {
            cropHeight = img.height;
            cropWidth = img.height / aspectRatio;
          }
          
          canvas.width = cropWidth;
          canvas.height = cropHeight;
          
          const ctx = canvas.getContext('2d');
          if (ctx) {
            const sx = (img.width - cropWidth) / 2;
            const sy = (img.height - cropHeight) / 2;
            ctx.drawImage(img, sx, sy, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
            const imageDataUrl = canvas.toDataURL('image/jpeg');
            setCapturedImage(imageDataUrl);
          }
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleIdentify = async () => {
    if (capturedImage) {
      try {
        const formData = new FormData();
        const blob = await fetch(capturedImage).then(r => r.blob());
        formData.append('file', blob, 'image.jpg');

        const response = await fetch('http://localhost:3000/upload', {
          method: 'POST',
          body: formData,
        });

        if (response.ok) {
          const result = await response.json();
          setIdentifyResult(result.itemInfo);
        } else {
          console.error('识别失败');
          setIdentifyResult(null);
        }
      } catch (error) {
        console.error('识别过程出错:', error);
        setIdentifyResult(null);
      }
    }
  };

  const renderResultTable = (result: any[]) => (
    <table className="w-full mt-4 border-collapse border border-gray-300">
      <tbody>
        {result.map((item, index) => (
          <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
            <td className="border border-gray-300 p-2 font-semibold">{item.name}</td>
            <td className="border border-gray-300 p-2">{item.value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <div className="p-4">
      {/* <h2 className="text-xl font-bold mb-4">文物识别</h2> */}
      {!capturedImage ? (
        <>
          <div className="relative w-full pb-[120%] mb-4"> {/* 宽高比容器 */}
            <video 
              ref={videoRef} 
              autoPlay 
              className="absolute top-0 left-0 w-full h-full object-cover rounded-lg"
            />
          </div>
          <div className="flex justify-around mb-4">
            <button
              onClick={handleCapture}
              className="flex flex-col items-center bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700"
            >
              <Camera className="w-6 h-6 mb-1" />
              拍照
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700"
            >
              <Upload className="w-6 h-6 mb-1" />
              上传图片
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleUpload}
              accept="image/*"
              className="hidden"
            />
          </div>
        </>
      ) : (
        <div className="mb-4">
          <div className="relative w-full pb-[120%] mb-4"> {/* 宽高比容器 */}
            <img 
              src={capturedImage} 
              alt="Captured" 
              className="absolute top-0 left-0 w-full h-full object-cover rounded-lg"
            />
          </div>
          <button
            onClick={handleIdentify}
            className="w-full bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700"
          >
            开始识别
          </button>
          {identifyResult && (
            <div className="mt-4 p-4 bg-gray-100 rounded-lg">
              <h3 className="font-bold mb-2">识别结果：</h3>
              {renderResultTable(identifyResult)}
            </div>
          )}
          <button
            onClick={() => setCapturedImage(null)}
            className="mt-4 w-full bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700"
          >
            重新拍照
          </button>
        </div>
      )}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

// Main App Component
export function AppComponent() {
  const [activeCategory, setActiveCategory] = useState('机制银币')
  const [activeFilter, setActiveFilter] = useState(['jizhiyinbi', '', '', '', '', ''])
  const [activePage, setActivePage] = useState('database')
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [showLogin, setShowLogin] = useState(false)
  const [showRegister, setShowRegister] = useState(false)
  const [userData, setUserData] = useState<{ username: string; userRole: string } | null>(null)
  const [selectedPid, setSelectedPid] = useState<string | null>(null)
  const [showHistory, setShowHistory] = useState(false)
  const [classification, setClassification] = useState({})
  const [artifacts, setArtifacts] = useState<Array<{pid: string, url: string, title: string}>>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const observer = useRef<IntersectionObserver | null>(null);
  const [showFavorites, setShowFavorites] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // 添加 isFilterPopoverOpen 状态
  const [isFilterPopoverOpen, setIsFilterPopoverOpen] = useState(false);

  // 在 AppComponent 中添加新的状态
  const [pageStack, setPageStack] = useState<PageStack>({
    database: ['main'],
    identify: ['main'],
    profile: ['main'],
  });

  const lastArtifactElementRef = useCallback((node: HTMLDivElement | null) => {
    if (loading) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        setPage(prevPage => prevPage + 1);
      }
    });
    if (node) observer.current.observe(node);
  }, [loading, hasMore]);

  const fetchArtifacts = useCallback(async () => {
    setLoading(true);
    try {
      const params: Params = {
        c0: activeFilter[0],
        c1: activeFilter[1],
        c2: activeFilter[2],
        c3: activeFilter[3],
        c4: activeFilter[4],
        c5: activeFilter[5],
        page,
        limit: 10
      };
      // 移除所有空字符串的参数
      (Object.keys(params) as Array<keyof Params>).forEach(key => params[key] === '' && delete params[key]);
      
      const response = await api.get('/artifacts/searchItems', { params });
      const newArtifacts = response.data;
      setArtifacts(prev => page === 1 ? newArtifacts : [...prev, ...newArtifacts]);
      setHasMore(newArtifacts.length === 10);
    } catch (error) {
      console.error('Failed to fetch artifacts:', error);
    } finally {
      setLoading(false);
    }
  }, [activeFilter, page]);

  useEffect(() => {
    fetchArtifacts();
  }, [fetchArtifacts]);

  const handleFilterChange = useCallback((newFilter: string[]) => {
    setActiveFilter(newFilter);
    setPage(1);
    setArtifacts([]);
    setHasMore(true);
    // 不需要在这里关闭 FilterPopover，因为我们希望用户可以继续选择
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      vertifyLoginStatus(token)
    }
  }, [])

  useEffect(() => {
    const fetchClassification = async () => {
      try {
        const response = await axios.get('http://localhost:3000/api/artifacts/classification')
        setClassification(response.data)
      } catch (error) {
        console.error('Failed to fetch classification:', error)
      }
    }
    fetchClassification()
  }, [])

  const vertifyLoginStatus = async (token: string) => {
    try {
      const response = await axios.get('http://localhost:3000/api/users/verify', {
        headers: {
          Authorization: token
        }
      });
      
      if (response.status === 200 && response.data) {
        const { username, id } = response.data;
        setIsLoggedIn(true);
        setUserData({ username, userRole: id.toString() });
      } else {
        handleLogout();
      }
    } catch (error) {
      console.error('登录状态验证失败:', error);
      handleLogout();
    }
  }

  const handleLogin = async (username: string, password: string) => {
    try {
      const response = await axios.post('http://localhost:3000/api/users/login', {
        username,
        password
      });
      
      if (response.status === 200 && response.data.token) {
        const { token, id, username } = response.data;
        localStorage.setItem('token', token);
        setIsLoggedIn(true);
        setUserData({ username, userRole: id.toString() });
        setShowLogin(false);
      } else {
        throw new Error(response.data.message || '登录失败');
      }
    } catch (error) {
      console.error('登录失败:', error);
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(error.response.data.message || '登录失败，请重试');
      } else {
        throw new Error('登录失败，请重试');
      }
    }
  }

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUserData(null);
    localStorage.removeItem('token');
  }

  const handleCategoryChange = (category: string) => {
    setActiveCategory(category);
    const c0 = Object.keys(classification).find(key => (classification as Classification)[key]?.unicode === category);
    const newFilter = [c0 || '', '', '', '', '', ''];
    setActiveFilter(newFilter);
    handleFilterChange(newFilter); // 触发筛选
  };

  // 修改 handleArtifactClick 函数
  const handleArtifactClick = (pid: string) => {
    setSelectedPid(pid);
    setPageStack(prev => ({
      ...prev,
      [activePage]: [...prev[activePage as keyof PageStack], 'detail'],
    }));
  };

  // 添加新的导航函数
  const navigateTo = (page: string) => {
    if (['database', 'identify', 'profile'].includes(page)) {
      setActivePage(page as 'database' | 'identify' | 'profile');
      setPageStack(prev => ({
        ...prev,
        [page]: ['main'],
      }));
      setShowLogin(false);
      setShowRegister(false);
    } else {
      setPageStack(prev => ({
        ...prev,
        [activePage]: [...prev[activePage as keyof PageStack], page],
      }));
    }
  };

  const goBack = () => {
    setPageStack(prev => {
      const currentStack = prev[activePage as keyof PageStack];
      if (currentStack.length > 1) {
        return {
          ...prev,
          [activePage]: currentStack.slice(0, -1),
        };
      }
      return prev;
    });
  };

  // 显示 Toast 的函数
  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
  };

  // 更新 handleFavorite 函数
  const handleFavorite = async (pid: string) => {
    try {
      const token = localStorage.getItem('token')
      if (token) {
        await api.post('/user-actions/favorite', { pid });
        showToast('已加入收藏', 'success');
      } else {
        showToast('请先登录', 'error');
      }
    } catch (error) {
      console.error('Failed to add to favorites:', error);
      showToast('加入收藏失败，请重试', 'error');
    }
  }

  const handleRegister = async (username: string, password: string) => {
    try {
      const response = await api.post('/users/register', {
        username,
        password,
        userRole: 'user' // 默认用户角色
      });
      
      if (response.status === 200) {
        showToast('注册成功', 'success');
        // 不要在这里自动登录，而是提示用户去登录
        setShowRegister(false);
        setShowLogin(true);
      } else {
        throw new Error(response.data.message || '注册失败');
      }
    } catch (error) {
      console.error('注册失败:', error);
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(error.response.data.message || '册失败，请重试');
      } else {
        throw new Error('注册失败，请重试');
      }
    }
  }

  // 修改 renderPage 函数
  const renderPage = () => {
    if (showLogin) {
      return <Login onLogin={handleLogin} onSwitchToRegister={() => { setShowLogin(false); setShowRegister(true); }} />
    }

    if (showRegister) {
      return <Register onRegister={handleRegister} onSwitchToLogin={() => { setShowRegister(false); setShowLogin(true); }} />
    }

    const currentStack = pageStack[activePage as keyof PageStack];
    const currentPage = currentStack[currentStack.length - 1];

    switch (activePage) {
      case 'database':
        switch (currentPage) {
          case 'main':
            return (
              <>
                <Header isLoggedIn={isLoggedIn} onLoginClick={() => setShowLogin(true)} />
                <div className="relative">
                  <Navigation
                    activeCategory={activeCategory}
                    onCategoryChange={handleCategoryChange}
                    onFilterClick={() => setIsFilterPopoverOpen(!isFilterPopoverOpen)}
                    classification={classification}
                  />
                  <FilterPopover
                    isOpen={isFilterPopoverOpen}
                    onClose={() => setIsFilterPopoverOpen(false)}
                    onFilterChange={handleFilterChange}
                    classification={classification}
                  />
                </div>
                <ArtifactGrid 
                  filter={activeFilter} 
                  onArtifactClick={handleArtifactClick}
                  artifacts={artifacts}
                  loading={loading}
                  hasMore={hasMore}
                  setPage={setPage}
                  lastArtifactElementRef={lastArtifactElementRef}
                />
              </>
            );
          case 'detail':
            return (
              <DetailPage
                pid={selectedPid || ''}
                onBack={goBack}
                showToast={showToast}
              />
            );
          default:
            return null;
        }
      case 'identify':
        return (
          <>
            <Header isLoggedIn={isLoggedIn} onLoginClick={() => setShowLogin(true)} title="文物识别" />
            <IdentifyPage />
          </>
        );
      case 'profile':
        switch (currentPage) {
          case 'main':
            return (
              <div className="min-h-screen bg-gray-100">
                <ProfileHeader 
                  username={userData?.username} 
                  userId={userData?.userRole} 
                  isLoggedIn={isLoggedIn} 
                  onLoginClick={() => setShowLogin(true)} 
                />
                <div className="mt-2 bg-white">
                  <ProfileMenuItem 
                    icon={<Settings className="w-5 h-5 text-red-700" />} 
                    title="设置" 
                    onClick={() => {}} 
                    disabled={!isLoggedIn}
                  />
                  <ProfileMenuItem 
                    icon={<Star className="w-5 h-5 text-red-700" />} 
                    title="收藏" 
                    onClick={() => isLoggedIn ? navigateTo('favorites') : showToast('请先登录', 'error')} 
                    disabled={!isLoggedIn}
                  />
                  <ProfileMenuItem 
                    icon={<Clock className="w-5 h-5 text-red-700" />} 
                    title="历史" 
                    onClick={() => isLoggedIn ? navigateTo('history') : showToast('请先登录', 'error')} 
                    disabled={!isLoggedIn}
                  />
                  {isLoggedIn && (
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-3 text-red-700 font-medium border-t border-gray-200"
                    >
                      退出登录
                    </button>
                  )}
                </div>
              </div>
            );
          case 'favorites':
            return (
              <FavoritesPage
                onBack={goBack}
                onArtifactClick={handleArtifactClick}
                showToast={showToast}
              />
            );
          case 'history':
            return (
              <HistoryPage
                onBack={goBack}
                onArtifactClick={handleArtifactClick}
              />
            );
          case 'detail':
            return (
              <DetailPage
                pid={selectedPid || ''}
                onBack={goBack}
                showToast={showToast}
              />
            );
          default:
            return null;
        }
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 pb-16">
      {renderPage()}
      <BottomNav activePage={activePage} onPageChange={navigateTo} />
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  )
}