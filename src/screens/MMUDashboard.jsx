import { collection, getCountFromServer, onSnapshot, query, where } from 'firebase/firestore';
import {
    BarChart,
    BookMarked,
    BookOpen,
    Building,
    Calendar,
    Clock,
    Download,
    Filter,
    Home,
    LogOut,
    Menu,
    Moon,
    RefreshCcw,
    Settings,
    Sun,
    User,
    UserCog,
    UserPlus,
    Users
} from 'lucide-react';
import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase/firebase';
import AllocationsManagement from './mmu/AllocationsManagement';
import CoursesManagement from './mmu/CoursesManagement';
import DepartmentsManagement from './mmu/DepartmentsManagement';
import EnhancedScheduleCalendar from './mmu/EnhancedScheduleCalendar';
import FacultiesManagement from './mmu/FacultiesManagement';
import ProgramsManagement from './mmu/ProgramsManagement';
import RoomManagement from './mmu/RoomManagement';
import SettingsScreen from './mmu/SettingsScreen';
import UsersManagement from './mmu/UsersManagement';

const MMUDashboard = ({ darkMode, updateDarkMode }) => {
  const [activeSection, setActiveSection] = useState('dashboard');
  const [menuOpen, setMenuOpen] = useState(true);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState(null);

  // Use the role from the authenticated user
  const userRole = user?.role || 'admin';

  // State for dashboard statistics
  const [stats, setStats] = useState({
    departments: 0,
    programs: 0,
    courses: 0,
    lecturers: 0,
    students: 0,
    activeClasses: 0,
    collisions: 0,
  });

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
      // You could add error handling/notification here
    }
  };

  // Fetch real-time statistics from Firestore
  useEffect(() => {
    setIsLoading(true);
    
    const fetchStatistics = async () => {
      try {
        // Get departments count
        const departmentsRef = collection(db, 'departments');
        const departmentsQuery = query(departmentsRef, where('isActive', '==', true));
        const departmentsSnapshot = await getCountFromServer(departmentsQuery);
        const departmentsCount = departmentsSnapshot.data().count;
        
        // Get programs count
        const programsRef = collection(db, 'programs');
        const programsQuery = query(programsRef, where('isActive', '==', true));
        const programsSnapshot = await getCountFromServer(programsQuery);
        const programsCount = programsSnapshot.data().count;
        
        // Get courses count
        const coursesRef = collection(db, 'courses');
        const coursesQuery = query(coursesRef, where('isActive', '==', true));
        const coursesSnapshot = await getCountFromServer(coursesQuery);
        const coursesCount = coursesSnapshot.data().count;
        
        // Get users count by role
        const usersRef = collection(db, 'users');
        
        // Lecturers count
        const lecturersQuery = query(usersRef, where('role', '==', 'lecturer'), where('isActive', '==', true));
        const lecturersSnapshot = await getCountFromServer(lecturersQuery);
        const lecturersCount = lecturersSnapshot.data().count;
        
        // Students count
        const studentsQuery = query(usersRef, where('role', '==', 'student'), where('isActive', '==', true));
        const studentsSnapshot = await getCountFromServer(studentsQuery);
        const studentsCount = studentsSnapshot.data().count;
        
        // Get active classes count
        const classesRef = collection(db, 'allocations');
        const activeClassesQuery = query(classesRef, where('status', '==', 'active'));
        const activeClassesSnapshot = await getCountFromServer(activeClassesQuery);
        const activeClassesCount = activeClassesSnapshot.data().count;
        
        // Get collisions count - we'll check for allocations with collision flag
        const collisionsQuery = query(classesRef, where('hasCollision', '==', true));
        const collisionsSnapshot = await getCountFromServer(collisionsQuery);
        const collisionsCount = collisionsSnapshot.data().count;
        
        // Update stats state with real data
        setStats({
          departments: departmentsCount,
          programs: programsCount,
          courses: coursesCount,
          lecturers: lecturersCount,
          students: studentsCount,
          activeClasses: activeClassesCount,
          collisions: collisionsCount,
        });
        
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching statistics:', error);
        setIsLoading(false);
      }
    };
    
    fetchStatistics();
    
    // Set up real-time listeners for critical data
    // We'll update certain statistics in real-time for better UX
    
    // Active classes listener
    const classesRef = collection(db, 'allocations');
    const activeClassesQuery = query(classesRef, where('status', '==', 'active'));
    const classesUnsubscribe = onSnapshot(activeClassesQuery, (snapshot) => {
      setStats(prevStats => ({
        ...prevStats,
        activeClasses: snapshot.size
      }));
    });
    
    // Collisions listener
    const collisionsQuery = query(classesRef, where('hasCollision', '==', true));
    const collisionsUnsubscribe = onSnapshot(collisionsQuery, (snapshot) => {
      setStats(prevStats => ({
        ...prevStats,
        collisions: snapshot.size
      }));
    });
    
    // Clean up listeners
    return () => {
      classesUnsubscribe();
      collisionsUnsubscribe();
    };
  }, []);

  // Group menu items into logical sections
  const menuSections = [
    {
      title: "Main",
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: Home }
      ]
    },
    {
      title: "Resource Management",
      items: [
        { id: 'faculties', label: 'Faculties', icon: Building },
        { id: 'departments', label: 'Departments', icon: Building },
        { id: 'programs', label: 'Programs', icon: BookMarked },
        { id: 'courses', label: 'Course Units', icon: BookOpen },
        { id: 'rooms', label: 'Room Management', icon: Building, adminOnly: true }
      ]
    },
    {
      title: "User Management",
      items: [
        { id: 'users', label: 'Users Management', icon: Users }
      ]
    },
    {
      title: "Scheduling",
      items: [
        { id: 'allocations', label: 'Allocate Courses', icon: UserCog },
        { id: 'schedule', label: 'Schedule Calendar', icon: Calendar }
      ]
    },
    {
      title: "System",
      items: [
        { id: 'analytics', label: 'Analytics', icon: BarChart },
        { id: 'settings', label: 'Settings', icon: Settings }
      ]
    }
  ];

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  const toggleTheme = () => {
    updateDarkMode(!darkMode);
  };

  const renderContent = () => {
    switch(activeSection) {
      case 'users':
        return <UsersManagement darkMode={darkMode} userRole={userRole} />;
      case 'faculties':
        return <FacultiesManagement darkMode={darkMode} userRole={userRole} />;
      case 'departments':
        return <DepartmentsManagement 
          darkMode={darkMode} 
          userRole={userRole} 
          setActiveSection={setActiveSection} 
          setSelectedProgramDept={setSelectedDepartmentId} 
        />;
      case 'programs':
        return <ProgramsManagement 
          darkMode={darkMode} 
          userRole={userRole} 
          selectedDepartmentId={selectedDepartmentId} 
          onDepartmentSelected={(id) => setSelectedDepartmentId(id)}
        />;
      case 'courses':
        return <CoursesManagement darkMode={darkMode} userRole={userRole} />;
      case 'rooms':
        return <RoomManagement darkMode={darkMode} userRole={userRole} />;
      case 'allocations':
        return <AllocationsManagement darkMode={darkMode} userRole={userRole} />;
      case 'schedule':
        return <EnhancedScheduleCalendar darkMode={darkMode} userRole={userRole} userDepartment={user?.department} />;
      case 'analytics':
        return <AnalyticsScreen darkMode={darkMode} stats={stats} />;
      case 'settings':
        return <SettingsScreen darkMode={darkMode} userRole={userRole} />;
      default:
        return renderAdminDashboard();
    }
  };

  // Admin Dashboard View with university-wide focus
  const renderAdminDashboard = () => (
    <div className="p-6">
      <div className="mb-6">
        <h1 className={`text-2xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
          University Lecture Management System
        </h1>
        <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
          Administrative Dashboard - University-wide Overview
        </p>
      </div>

      {/* University-wide Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatsCard 
          title="Departments" 
          value={isLoading ? '...' : stats.departments}
          icon={<Building className={`h-6 w-6 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />}
          darkMode={darkMode}
          color="blue"
          isLoading={isLoading}
        />
        <StatsCard 
          title="Programs" 
          value={isLoading ? '...' : stats.programs}
          icon={<BookMarked className={`h-6 w-6 ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`} />}
          darkMode={darkMode}
          color="indigo"
          isLoading={isLoading}
        />
        <StatsCard 
          title="Course Units" 
          value={isLoading ? '...' : stats.courses}
          icon={<BookOpen className={`h-6 w-6 ${darkMode ? 'text-amber-400' : 'text-amber-600'}`} />}
          darkMode={darkMode}
          color="amber"
          isLoading={isLoading}
        />
        <StatsCard 
          title="Lecturers" 
          value={isLoading ? '...' : stats.lecturers}
          icon={<Users className={`h-6 w-6 ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`} />}
          darkMode={darkMode}
          color="emerald"
          isLoading={isLoading}
        />
      </div>

      {/* System-wide Metrics */}
      <div className={`p-6 rounded-lg shadow-sm mb-8 ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
        <h2 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
          System Overview
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
          <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
            <div className="flex items-center justify-between mb-3">
              <span className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Total Students
              </span>
              <UserPlus className={`h-5 w-5 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
            </div>
            <div className="flex items-end justify-between">
              <span className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                {isLoading ? '...' : stats.students}
              </span>
              {!isLoading && (
                <span className="text-xs px-2 py-1 rounded-full bg-green-500/10 text-green-500">
                  Active
                </span>
              )}
            </div>
          </div>
          
          <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
            <div className="flex items-center justify-between mb-3">
              <span className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Active Classes
              </span>
              <Calendar className={`h-5 w-5 ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`} />
            </div>
            <div className="flex items-end justify-between">
              <span className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                {isLoading ? '...' : stats.activeClasses}
              </span>
              {!isLoading && (
                <span className="text-xs px-2 py-1 rounded-full bg-blue-500/10 text-blue-500">
                  Currently Running
                </span>
              )}
            </div>
          </div>
          
          <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
            <div className="flex items-center justify-between mb-3">
              <span className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                System Status
              </span>
              <Settings className={`h-5 w-5 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`} />
            </div>
            <div className="flex items-end justify-between">
              <span className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                All Systems Online
              </span>
              <span className="text-xs px-2 py-1 rounded-full bg-green-500/10 text-green-500">
                100% Uptime
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Admin Actions */}
      <div className={`p-6 rounded-lg shadow-sm mb-8 ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
        <h2 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
          Administrative Actions
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <QuickActionButton
            label="Register User"
            icon={<UserPlus size={20} />}
            onClick={() => setActiveSection('users')}
            darkMode={darkMode}
          />
          <QuickActionButton
            label="Add Department"
            icon={<Building size={20} />}
            onClick={() => setActiveSection('departments')}
            darkMode={darkMode}
          />
          <QuickActionButton
            label="System Analytics"
            icon={<BarChart size={20} />}
            onClick={() => setActiveSection('analytics')}
            darkMode={darkMode}
          />
          <QuickActionButton
            label="View Schedule"
            icon={<Calendar size={20} />}
            onClick={() => setActiveSection('schedule')}
            darkMode={darkMode}
          />
        </div>
      </div>

      {/* Collision alerts */}
      {!isLoading && stats.collisions > 0 && (
        <div className={`p-6 rounded-lg ${darkMode ? 'bg-red-900/20 border border-red-800' : 'bg-red-50 border border-red-100'} mb-8`}>
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-full ${darkMode ? 'bg-red-900/30' : 'bg-red-100'}`}>
              <Clock className={`h-5 w-5 ${darkMode ? 'text-red-400' : 'text-red-600'}`} />
            </div>
            <div>
              <h3 className={`font-medium text-lg mb-1 ${darkMode ? 'text-red-400' : 'text-red-700'}`}>
                University-wide Lecture Collision Alert
              </h3>
              <p className={`text-sm ${darkMode ? 'text-red-300' : 'text-red-600'} mb-3`}>
                There are currently {stats.collisions} lecture collisions across departments that need to be resolved.
              </p>
              <button 
                onClick={() => setActiveSection('schedule')}
                className={`text-sm px-3 py-1.5 rounded-md ${
                  darkMode ? 'bg-red-900/40 text-red-300 hover:bg-red-900/60' : 
                  'bg-red-100 text-red-700 hover:bg-red-200'
                }`}
              >
                View & Resolve Collisions
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className={`h-screen flex flex-col ${darkMode ? 'bg-[var(--polaris-bg-darker)]' : 'bg-gray-50'} text-gray-900 dark:text-gray-100`}>
      {/* Top Navigation */}
      <header className={`border-b ${darkMode ? 'border-[var(--polaris-border-dark)]' : 'border-gray-200'} py-3 px-6 flex items-center justify-between ${darkMode ? 'bg-[var(--polaris-bg-dark)]' : 'bg-white shadow-sm'}`}>
        <div className="flex items-center">
          <button
            onClick={toggleMenu}
            className={`p-2 rounded-md ${darkMode ? 'hover:bg-[var(--polaris-card-bg)] text-gray-300' : 'hover:bg-gray-100 text-gray-800'} mr-3`}
          >
            <Menu className="h-6 w-6" />
          </button>
          <div className="flex items-center">
            <div className="flex items-center justify-center w-9 h-9 rounded bg-[var(--polaris-accent-blue)] text-white font-bold text-base mr-3">
              MMU
            </div>
            <h1 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>MMU Admin Dashboard</h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={toggleTheme}
            className={`p-2 rounded-md ${darkMode ? 'bg-[var(--polaris-card-bg)]' : 'bg-gray-100'}`}
          >
            {darkMode ? <Sun className="h-5 w-5 text-yellow-400" /> : <Moon className="h-5 w-5 text-gray-700" />}
          </button>
          <div className={`flex items-center ml-4 p-2 rounded-full ${darkMode ? 'bg-[var(--polaris-card-bg)]' : 'bg-gray-100'}`}>
            <span className="text-sm font-medium mr-2">{user?.displayName || user?.email}</span>
            <User className={`h-5 w-5 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`} />
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside
          className={`${menuOpen ? 'w-64' : 'w-16'} transition-all duration-300 ease-in-out border-r ${
            darkMode ? 'bg-[var(--polaris-bg-dark)] border-[var(--polaris-border-dark)]' : 'bg-white border-gray-200'
          } flex flex-col overflow-y-auto custom-scrollbar`}
        >
          <div className="p-2">
            {menuSections.map((section, sectionIndex) => (
              <div key={sectionIndex} className="mb-4">
                {menuOpen && (
                  <div className={`px-3 py-2 text-xs font-semibold uppercase tracking-wider ${
                    darkMode ? 'text-gray-500' : 'text-gray-400'
                  }`}>
                    {section.title}
                  </div>
                )}
                <div className="space-y-0.5">
                  {section.items
                    .filter(item => !item.adminOnly || userRole === 'admin')
                    .map(item => (
                      <button
                        key={item.id}
                        onClick={() => setActiveSection(item.id)}
                        className={`w-full flex items-center ${
                          !menuOpen ? 'justify-center px-2 py-3' : 'px-3 py-2'
                        } rounded text-sm ${
                          activeSection === item.id
                            ? `${darkMode ? 'bg-[var(--polaris-card-bg)] text-white' : 'bg-blue-50 text-blue-700 font-medium'}`
                            : `${darkMode ? 'hover:bg-[var(--polaris-card-bg)] text-gray-400' : 'hover:bg-gray-100 text-gray-700'}`
                        } transition-colors`}
                      >
                        <item.icon size={menuOpen ? 16 : 20} className="min-w-5" />
                        {menuOpen && <span className="ml-3 truncate">{item.label}</span>}
                      </button>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* Main content wrapper */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Main content header with expand/minimize toggle */}
          <div className={`py-3 px-6 border-b ${darkMode ? 'border-[var(--polaris-border-dark)] bg-[var(--polaris-bg-dark)]' : 'border-gray-200 bg-white shadow-sm'}`}>
            <div className="flex items-center justify-between">
              <h2 className={`text-base font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                {(() => {
                  // Find the section containing the active item
                  const section = menuSections.find(section => 
                    section.items.some(item => item.id === activeSection)
                  );
                  
                  // If found, return the item label
                  if (section) {
                    const activeItem = section.items.find(item => item.id === activeSection);
                    return activeItem?.label || 'Dashboard';
                  }
                  
                  return 'Dashboard';
                })()}
              </h2>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className={`p-2 rounded ${darkMode ? 'hover:bg-[var(--polaris-card-bg)] text-gray-400' : 'hover:bg-gray-100 text-gray-600'}`}
                  title={menuOpen ? "Collapse sidebar" : "Expand sidebar"}
                >
                  {menuOpen ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                      <line x1="9" y1="3" x2="9" y2="21"></line>
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                      <line x1="15" y1="3" x2="15" y2="21"></line>
                    </svg>
                  )}
                </button>
                <button
                  onClick={() => document.documentElement.requestFullscreen()}
                  className={`p-2 rounded ${darkMode ? 'hover:bg-[var(--polaris-card-bg)] text-gray-400' : 'hover:bg-gray-100 text-gray-600'}`}
                  title="Fullscreen"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path>
                  </svg>
                </button>
              </div>
            </div>
          </div>
          
          {/* Main content area */}
          <div className={`flex-1 overflow-auto w-full pb-16 ${darkMode ? '' : 'bg-gray-50'}`}>
            {renderContent()}
          </div>
        </div>
      </div>

      {/* Fixed Bottom Navigation */}
      <div className={`fixed bottom-0 left-0 right-0 z-10 border-t ${
        darkMode ? 'bg-[var(--polaris-bg-dark)] border-[var(--polaris-border-dark)]' : 'bg-white border-gray-200 shadow-md'
      } py-3 px-6`}>
        <div className="flex items-center justify-between max-w-screen-xl mx-auto">
          {/* MMU@Date on the left */}
          <div className="flex items-center">
            <span className={`text-base font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              MMU@{new Date().toLocaleDateString()} - {user?.role === 'admin' ? 'Administrator' : 'Department Head'}
            </span>
          </div>

          {/* Logout and Dark Mode Toggle on the right */}
          <div className="flex items-center gap-4">
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-full ${darkMode ? 'bg-[var(--polaris-card-bg)]' : 'bg-gray-100'}`}
              title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
            >
              {darkMode ? <Sun className="h-6 w-6 text-yellow-400" /> : <Moon className="h-6 w-6 text-gray-700" />}
            </button>
            
            <button
              onClick={handleLogout}
              className={`flex items-center gap-2 px-4 py-2 rounded ${
                darkMode ? 'bg-red-900/20 text-red-400 hover:bg-red-900/30' : 'bg-red-100 text-red-700 hover:bg-red-200'
              }`}
              title="Logout"
            >
              <LogOut className="h-5 w-5" />
              <span className="text-base font-medium">Logout</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Modified StatsCard Component for better light mode visibility
const StatsCard = ({ title, value, icon, darkMode, color, isLoading }) => {
  const getColorClasses = (colorName) => {
    const colorMap = {
      blue: {
        light: 'text-blue-600 bg-blue-100',
        dark: 'text-blue-400 bg-blue-900/30'
      },
      indigo: {
        light: 'text-indigo-600 bg-indigo-100',
        dark: 'text-indigo-400 bg-indigo-900/30'
      },
      amber: {
        light: 'text-amber-600 bg-amber-100',
        dark: 'text-amber-400 bg-amber-900/30'
      },
      emerald: {
        light: 'text-emerald-600 bg-emerald-100',
        dark: 'text-emerald-400 bg-emerald-900/30'
      },
      red: {
        light: 'text-red-600 bg-red-100',
        dark: 'text-red-400 bg-red-900/30'
      }
    };
    return colorMap[colorName] || colorMap.blue;
  };

  const colorClasses = getColorClasses(color);

  return (
    <div className={`rounded-lg p-4 border ${
      darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
    }`}>
      <div className="flex justify-between items-center mb-3">
        <div className={`p-2 rounded-full ${
          darkMode ? colorClasses.dark : colorClasses.light
        }`}>
          {icon}
        </div>
        <span className={`text-xl font-semibold ${
          darkMode ? colorClasses.dark.split(' ')[0] : colorClasses.light.split(' ')[0]
        }`}>
          {isLoading ? (
            <div className="animate-pulse h-6 w-8 bg-gray-300 dark:bg-gray-700 rounded"></div>
          ) : (
            value
          )}
        </span>
      </div>
      <h3 className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-700 font-medium'}`}>{title}</h3>
    </div>
  );
};

StatsCard.propTypes = {
  title: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
  icon: PropTypes.node.isRequired,
  darkMode: PropTypes.bool.isRequired,
  color: PropTypes.string.isRequired,
  isLoading: PropTypes.bool,
};

StatsCard.defaultProps = {
  isLoading: false,
};

// Modified QuickActionButton Component for better light mode visibility
const QuickActionButton = ({ label, icon, onClick, darkMode }) => {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center p-2 rounded border ${
        darkMode 
          ? 'bg-[var(--polaris-card-bg)] hover:bg-gray-800 border-[var(--polaris-border-dark)]' 
          : 'bg-white hover:bg-gray-50 border-gray-200 shadow-sm'
      }`}
    >
      <div className={`p-1.5 rounded mb-1 ${
        darkMode ? 'bg-blue-900/20 text-blue-400' : 'bg-blue-50 text-blue-700'
      }`}>
        {icon}
      </div>
      <span className={`text-xs font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{label}</span>
    </button>
  );
};

MMUDashboard.propTypes = {
  darkMode: PropTypes.bool.isRequired,
  updateDarkMode: PropTypes.func.isRequired,
};

QuickActionButton.propTypes = {
  label: PropTypes.string.isRequired,
  icon: PropTypes.node.isRequired,
  onClick: PropTypes.func.isRequired,
  darkMode: PropTypes.bool.isRequired,
};

// Analytics Screen Component
const AnalyticsScreen = ({ darkMode, stats }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [dateRange, setDateRange] = useState('month');
  const [isLoading, setIsLoading] = useState(false);
  
  // Mock data for department analytics
  const departmentData = [
    { name: 'Computer Science', students: 365, courses: 38, lecturers: 12, rooms: 8, utilization: 94 },
    { name: 'Business Information Technology', students: 280, courses: 32, lecturers: 9, rooms: 6, utilization: 88 },
    { name: 'Business Administration', students: 450, courses: 42, lecturers: 14, rooms: 10, utilization: 91 },
    { name: 'Software Engineering', students: 180, courses: 28, lecturers: 8, rooms: 5, utilization: 85 },
    { name: 'Mechanical Engineering', students: 240, courses: 32, lecturers: 11, rooms: 7, utilization: 89 },
    { name: 'Electrical Engineering', students: 210, courses: 30, lecturers: 10, rooms: 7, utilization: 82 },
  ];
  
  // Mock data for course distribution
  const courseDistributionData = [
    { department: 'Computer Science', firstYear: 9, secondYear: 12, thirdYear: 9, fourthYear: 8 },
    { department: 'Business Information Technology', firstYear: 8, secondYear: 10, thirdYear: 8, fourthYear: 6 },
    { department: 'Business Administration', firstYear: 12, secondYear: 11, thirdYear: 10, fourthYear: 9 },
    { department: 'Software Engineering', firstYear: 7, secondYear: 8, thirdYear: 7, fourthYear: 6 },
    { department: 'Mechanical Engineering', firstYear: 8, secondYear: 9, thirdYear: 8, fourthYear: 7 },
    { department: 'Electrical Engineering', firstYear: 8, secondYear: 8, thirdYear: 7, fourthYear: 7 },
  ];
  
  // Calculate growth rates (we'll simulate this with random values for now)
  // In a real implementation, you would compare current vs previous period data
  const calculateGrowth = (value) => {
    // Simulate a random growth rate between -15% and +25%
    const randomGrowth = Math.floor(Math.random() * 40) - 15;
    return {
      value: value,
      percentage: randomGrowth,
      trend: randomGrowth >= 0 ? 'up' : 'down'
    };
  };
  
  // Generate metrics with growth calculations
  const metrics = {
    students: calculateGrowth(stats.students),
    departments: calculateGrowth(stats.departments),
    programs: calculateGrowth(stats.programs),
    courses: calculateGrowth(stats.courses),
    lecturers: calculateGrowth(stats.lecturers),
    activeClasses: calculateGrowth(stats.activeClasses),
    collisions: calculateGrowth(stats.collisions),
  };

  const handleRefreshData = () => {
    setIsLoading(true);
    
    // Simulate a refresh delay
    setTimeout(() => {
      setIsLoading(false);
    }, 1500);
  };
  
  const handleExportReport = (type) => {
    alert(`Exporting ${type} report. This feature will be implemented soon.`);
  };
  
  const handleDateRangeChange = (range) => {
    setDateRange(range);
  };

  const renderOverviewTab = () => (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <MetricCard 
          title="Total Students"
          value={metrics.students.value}
          icon={<Users className={`h-5 w-5 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />}
          trend={metrics.students}
          darkMode={darkMode}
          color="blue"
        />
        <MetricCard 
          title="Total Courses"
          value={metrics.courses.value}
          icon={<BookOpen className={`h-5 w-5 ${darkMode ? 'text-amber-400' : 'text-amber-600'}`} />}
          trend={metrics.courses}
          darkMode={darkMode}
          color="amber"
        />
        <MetricCard 
          title="Departments"
          value={metrics.departments.value}
          icon={<Building className={`h-5 w-5 ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`} />}
          trend={metrics.departments}
          darkMode={darkMode}
          color="indigo"
        />
        <MetricCard 
          title="Active Classes"
          value={metrics.activeClasses.value}
          icon={<Calendar className={`h-5 w-5 ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`} />}
          trend={metrics.activeClasses}
          darkMode={darkMode}
          color="emerald"
        />
      </div>
      
      {/* System Health Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className={`p-6 rounded-lg ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
          <h3 className={`font-semibold mb-4 flex items-center justify-between ${darkMode ? 'text-white' : 'text-gray-800'}`}>
            <span>Course Utilization</span>
            <span className={`${
              metrics.courses.value > 85 
                ? 'text-green-500 bg-green-500/10' 
                : metrics.courses.value > 70 
                  ? 'text-amber-500 bg-amber-500/10' 
                  : 'text-red-500 bg-red-500/10'
            } text-xs px-2 py-1 rounded-full`}>
              {Math.min(Math.round((metrics.courses.value / (metrics.courses.value + 20)) * 100), 100)}%
            </span>
          </h3>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center">
                  <div className={`w-3 h-3 rounded-full ${darkMode ? 'bg-emerald-500' : 'bg-emerald-500'} mr-2`}></div>
                  <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>System Health</span>
                </div>
                <div className="text-right">
                  <span className={`text-xs font-semibold inline-block ${darkMode ? 'text-white' : 'text-gray-600'}`}>
                    {Math.min(Math.round((metrics.courses.value / (metrics.courses.value + 20)) * 100), 100)}%
                  </span>
                </div>
              </div>
              <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-gray-200">
                <div 
                  style={{ width: `${Math.min(Math.round((metrics.courses.value / (metrics.courses.value + 20)) * 100), 100)}%` }} 
                  className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-green-500"
                ></div>
              </div>
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center">
                  <div className={`w-3 h-3 rounded-full ${darkMode ? 'bg-blue-500' : 'bg-blue-500'} mr-2`}></div>
                  <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Staff Allocation</span>
                </div>
                <div className="text-right">
                  <span className={`text-xs font-semibold inline-block ${darkMode ? 'text-white' : 'text-gray-600'}`}>
                    {Math.min(Math.round((metrics.lecturers.value / (metrics.courses.value * 0.3)) * 100), 100)}%
                  </span>
                </div>
              </div>
              <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-gray-200">
                <div 
                  style={{ width: `${Math.min(Math.round((metrics.lecturers.value / (metrics.courses.value * 0.3)) * 100), 100)}%` }} 
                  className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500"
                ></div>
              </div>
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center">
                  <div className={`w-3 h-3 rounded-full ${darkMode ? 'bg-amber-500' : 'bg-amber-500'} mr-2`}></div>
                  <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Room Usage</span>
                </div>
                <div className="text-right">
                  <span className={`text-xs font-semibold inline-block ${darkMode ? 'text-white' : 'text-gray-600'}`}>
                    {Math.min(Math.round(metrics.activeClasses.value / 100 * 100), 100)}%
                  </span>
                </div>
              </div>
              <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-gray-200">
                <div 
                  style={{ width: `${Math.min(Math.round(metrics.activeClasses.value / 100 * 100), 100)}%` }} 
                  className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-amber-500"
                ></div>
              </div>
            </div>
          </div>
        </div>
        
        <div className={`p-6 rounded-lg ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
          <h3 className={`font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>Student Distribution</h3>
          <div className="flex items-center justify-center h-52">
            <div className="text-center">
              <div className="text-4xl font-bold mb-2 text-blue-500">{metrics.students.value}</div>
              <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Total Students</div>
              <div className="mt-4 flex items-center justify-center gap-2">
                <span className={`text-xs px-2 py-1 rounded-full ${darkMode ? 'bg-green-900/20 text-green-400' : 'bg-green-100 text-green-600'}`}>
                  {metrics.students.percentage >= 0 ? `+${metrics.students.percentage}%` : `${metrics.students.percentage}%`} YoY
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <QuickStatCard 
          title="Lecturers"
          value={metrics.lecturers.value}
          subtitle={`${metrics.lecturers.percentage >= 0 ? '+' : ''}${metrics.lecturers.percentage}% from last semester`}
          darkMode={darkMode}
        />
        <QuickStatCard 
          title="Programs"
          value={metrics.programs.value}
          subtitle={`${metrics.programs.percentage >= 0 ? '+' : ''}${metrics.programs.percentage}% from last semester`}
          darkMode={darkMode}
        />
        <QuickStatCard 
          title="Schedule Efficiency" 
          value={`${Math.min(90 + metrics.activeClasses.percentage, 99)}%`}
          subtitle={`${metrics.activeClasses.percentage >= 0 ? '+' : ''}${metrics.activeClasses.percentage}% from last semester`}
          darkMode={darkMode}
        />
      </div>
    </div>
  );

  const renderDepartmentsTab = () => (
    <div className="space-y-6">
      <div className={`p-6 rounded-lg ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
        <h3 className={`font-semibold text-lg mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
          Department Performance
        </h3>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className={`${darkMode ? 'border-b border-gray-700' : 'border-b border-gray-200'}`}>
                <th className={`px-4 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wider`}>Department</th>
                <th className={`px-4 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wider`}>Students</th>
                <th className={`px-4 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wider`}>Courses</th>
                <th className={`px-4 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wider`}>Lecturers</th>
                <th className={`px-4 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wider`}>Rooms</th>
                <th className={`px-4 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wider`}>Utilization</th>
              </tr>
            </thead>
            <tbody>
              {departmentData.map((dept, index) => (
                <tr key={dept.name} className={`${index !== departmentData.length - 1 ? (darkMode ? 'border-b border-gray-700' : 'border-b border-gray-200') : ''}`}>
                  <td className={`px-4 py-3 text-sm ${darkMode ? 'text-white' : 'text-gray-800'} font-medium`}>{dept.name}</td>
                  <td className={`px-4 py-3 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{dept.students}</td>
                  <td className={`px-4 py-3 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{dept.courses}</td>
                  <td className={`px-4 py-3 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{dept.lecturers}</td>
                  <td className={`px-4 py-3 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{dept.rooms}</td>
                  <td className={`px-4 py-3 text-sm`}>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      dept.utilization > 90 
                        ? darkMode ? 'bg-green-900/20 text-green-400' : 'bg-green-100 text-green-600'
                        : dept.utilization > 80
                          ? darkMode ? 'bg-blue-900/20 text-blue-400' : 'bg-blue-100 text-blue-600'
                          : darkMode ? 'bg-amber-900/20 text-amber-400' : 'bg-amber-100 text-amber-600'
                    }`}>
                      {dept.utilization}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className={`p-6 rounded-lg ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
          <h3 className={`font-semibold text-lg mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
            Student Distribution
          </h3>
          <div className="h-64 flex items-center justify-center">
            {/* This would be a real pie chart in a production app */}
            <div className="relative w-48 h-48 rounded-full overflow-hidden border-8 border-gray-700 flex items-center justify-center">
              <div className="absolute inset-0">
                <div className="absolute w-1/2 h-full bg-blue-500 left-0"></div>
                <div className="absolute w-1/4 h-full bg-indigo-500 left-1/2"></div>
                <div className="absolute w-1/8 h-full bg-amber-500 left-3/4"></div>
                <div className="absolute w-1/8 h-full bg-emerald-500 left-7/8"></div>
              </div>
              <div className="bg-gray-800 w-32 h-32 rounded-full flex items-center justify-center z-10">
                <span className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>1,250</span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-4">
            {departmentData.map(dept => (
              <div key={dept.name} className="flex items-center">
                <div className="w-3 h-3 rounded-full mr-2 bg-blue-500"></div>
                <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  {dept.name}: {dept.students}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className={`p-6 rounded-lg ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
          <h3 className={`font-semibold text-lg mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
            Course Distribution
          </h3>
          <div className="h-64 overflow-y-auto">
            <table className="min-w-full">
              <thead className="sticky top-0 bg-gray-800">
                <tr className={`${darkMode ? 'border-b border-gray-700' : 'border-b border-gray-200'}`}>
                  <th className={`px-4 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wider`}>Department</th>
                  <th className={`px-4 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wider`}>1st Year</th>
                  <th className={`px-4 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wider`}>2nd Year</th>
                  <th className={`px-4 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wider`}>3rd Year</th>
                  <th className={`px-4 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wider`}>4th Year</th>
                </tr>
              </thead>
              <tbody>
                {courseDistributionData.map((data, index) => (
                  <tr key={data.department} className={`${index !== courseDistributionData.length - 1 ? (darkMode ? 'border-b border-gray-700' : 'border-b border-gray-200') : ''}`}>
                    <td className={`px-4 py-3 text-sm ${darkMode ? 'text-white' : 'text-gray-800'} font-medium`}>{data.department}</td>
                    <td className={`px-4 py-3 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{data.firstYear}</td>
                    <td className={`px-4 py-3 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{data.secondYear}</td>
                    <td className={`px-4 py-3 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{data.thirdYear}</td>
                    <td className={`px-4 py-3 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{data.fourthYear}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );

  const renderReportsTab = () => (
    <div className="space-y-6">
      <div className={`p-6 rounded-lg ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
        <h3 className={`font-semibold text-lg mb-6 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
          Generate Reports
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <ReportCard 
            title="Department Performance"
            description="Comprehensive performance metrics by department"
            icon={Building}
            onClick={() => handleExportReport('department')}
            darkMode={darkMode}
          />
          
          <ReportCard 
            title="Student Enrollment"
            description="Student statistics and enrollment trends"
            icon={Users}
            onClick={() => handleExportReport('enrollment')}
            darkMode={darkMode}
          />
          
          <ReportCard 
            title="Course Utilization"
            description="Course distribution and allocation statistics"
            icon={BookOpen}
            onClick={() => handleExportReport('courses')}
            darkMode={darkMode}
          />
          
          <ReportCard 
            title="Schedule Analysis"
            description="Room usage and schedule optimization insights"
            icon={Calendar}
            onClick={() => handleExportReport('schedule')}
            darkMode={darkMode}
          />
          
          <ReportCard 
            title="Lecturer Workload"
            description="Lecturer assignments and workload distribution"
            icon={Users}
            onClick={() => handleExportReport('lecturers')}
            darkMode={darkMode}
          />
          
          <ReportCard 
            title="System Performance"
            description="System usage and operational metrics"
            icon={BarChart}
            onClick={() => handleExportReport('system')}
            darkMode={darkMode}
          />
        </div>
      </div>
    </div>
  );
  
  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className={`text-3xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
            Analytics Dashboard
          </h1>
          <p className={`text-lg ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Comprehensive insights and performance metrics
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className={`flex items-center rounded-lg border px-4 py-2 ${
            darkMode ? 'border-gray-700 bg-gray-800/50' : 'border-gray-300 bg-white'
          }`}>
            <Filter className={`h-5 w-5 ${darkMode ? 'text-gray-400' : 'text-gray-500'} mr-2`} />
            <select 
              value={dateRange}
              onChange={(e) => handleDateRangeChange(e.target.value)}
              className={`outline-none border-none ${
                darkMode ? 'bg-transparent text-white' : 'bg-transparent text-gray-700'
              }`}
            >
              <option value="week" className={darkMode ? 'bg-gray-800' : 'bg-white'}>Last Week</option>
              <option value="month" className={darkMode ? 'bg-gray-800' : 'bg-white'}>Last Month</option>
              <option value="quarter" className={darkMode ? 'bg-gray-800' : 'bg-white'}>Last Quarter</option>
              <option value="year" className={darkMode ? 'bg-gray-800' : 'bg-white'}>Last Year</option>
            </select>
          </div>

          <button 
            onClick={handleRefreshData}
            disabled={isLoading}
            className={`p-2 rounded-lg ${
              darkMode 
                ? 'bg-blue-900/20 text-blue-400 hover:bg-blue-900/30' 
                : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
            }`}
          >
            <RefreshCcw className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <div className={`flex space-x-1 rounded-lg p-1 ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
          <button
            className={`w-full py-2.5 text-sm leading-5 font-medium rounded-md ${
              activeTab === 'overview' 
                ? darkMode ? 'bg-[var(--polaris-card-bg)] text-white' : 'bg-white shadow text-gray-800' 
                : darkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button
            className={`w-full py-2.5 text-sm leading-5 font-medium rounded-md ${
              activeTab === 'departments' 
                ? darkMode ? 'bg-[var(--polaris-card-bg)] text-white' : 'bg-white shadow text-gray-800' 
                : darkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('departments')}
          >
            Departments
          </button>
          <button
            className={`w-full py-2.5 text-sm leading-5 font-medium rounded-md ${
              activeTab === 'reports' 
                ? darkMode ? 'bg-[var(--polaris-card-bg)] text-white' : 'bg-white shadow text-gray-800' 
                : darkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('reports')}
          >
            Reports
          </button>
        </div>
      </div>

      {/* Tab content */}
      <div className="pb-6">
        {activeTab === 'overview' && renderOverviewTab()}
        {activeTab === 'departments' && renderDepartmentsTab()}
        {activeTab === 'reports' && renderReportsTab()}
      </div>
    </div>
  );
};

// Components for the analytics screen
const MetricCard = ({ title, value, icon, trend, darkMode, color }) => {
  const getColorClasses = (colorName) => {
    const colorMap = {
      blue: {
        light: 'text-blue-600 bg-blue-100',
        dark: 'text-blue-400 bg-blue-900/30'
      },
      indigo: {
        light: 'text-indigo-600 bg-indigo-100',
        dark: 'text-indigo-400 bg-indigo-900/30'
      },
      amber: {
        light: 'text-amber-600 bg-amber-100',
        dark: 'text-amber-400 bg-amber-900/30'
      },
      emerald: {
        light: 'text-emerald-600 bg-emerald-100',
        dark: 'text-emerald-400 bg-emerald-900/30'
      },
      red: {
        light: 'text-red-600 bg-red-100',
        dark: 'text-red-400 bg-red-900/30'
      }
    };
    
    return colorMap[colorName] || colorMap.blue;
  };

  const colorClasses = getColorClasses(color);
  const trendDirection = typeof trend === 'object' ? trend.trend : 'stable';
  const trendValue = typeof trend === 'object' ? (trend.percentage >= 0 ? `+${trend.percentage}%` : `${trend.percentage}%`) : trend;

  return (
    <div className={`p-6 rounded-lg ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
      <div className="flex items-center justify-between mb-3">
        <div className={`p-2 rounded-full ${darkMode ? colorClasses.dark : colorClasses.light}`}>
          {icon}
        </div>
        <span className="text-sm font-medium">{title}</span>
      </div>
      <div className="flex items-end justify-between">
        <span className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
          {value}
        </span>
        <span className={`text-xs px-2 py-1 rounded-full ${
          trendDirection === 'up' ? 'bg-green-500/10 text-green-500' : 
          trendDirection === 'down' ? 'bg-red-500/10 text-red-500' : 
          'bg-blue-500/10 text-blue-500'
        }`}>
          {trendValue}
        </span>
      </div>
    </div>
  );
};

const ReportCard = ({ title, description, icon: Icon, onClick, darkMode }) => {
  return (
    <button
      onClick={onClick}
      className={`p-6 rounded-lg text-left group ${
        darkMode ? 'bg-gray-700/30 hover:bg-gray-700/50 border border-gray-700' : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className={`p-2 rounded-full ${darkMode ? 'bg-blue-900/20' : 'bg-blue-50'}`}>
          <Icon className={`h-5 w-5 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
        </div>
        <Download className={`h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
      </div>
      <h3 className={`text-lg font-medium mb-1 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
        {title}
      </h3>
      <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
        {description}
      </p>
    </button>
  );
};

AnalyticsScreen.propTypes = {
  darkMode: PropTypes.bool.isRequired,
  stats: PropTypes.object.isRequired,
};

MetricCard.propTypes = {
  title: PropTypes.string.isRequired,
  value: PropTypes.number.isRequired,
  icon: PropTypes.node.isRequired,
  trend: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.object
  ]).isRequired,
  darkMode: PropTypes.bool.isRequired,
  color: PropTypes.string.isRequired
};

ReportCard.propTypes = {
  title: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
  icon: PropTypes.func.isRequired,
  onClick: PropTypes.func.isRequired,
  darkMode: PropTypes.bool.isRequired
};

// Helper component for Quick Stats
const QuickStatCard = ({ title, value, subtitle, darkMode }) => (
  <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
    <h4 className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{title}</h4>
    <div className={`text-xl font-semibold mt-1 ${darkMode ? 'text-white' : 'text-gray-800'}`}>{value}</div>
    <p className={`text-xs mt-1 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>{subtitle}</p>
  </div>
);

QuickStatCard.propTypes = {
  title: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
  subtitle: PropTypes.string.isRequired,
  darkMode: PropTypes.bool.isRequired
};

export default MMUDashboard; 