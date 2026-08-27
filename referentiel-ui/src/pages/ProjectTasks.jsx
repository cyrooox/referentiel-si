import React, { useState, useEffect, useRef, Fragment } from 'react';
import {
  AlertCircle, Check, Clock, Plus, Trash2, Save, ArrowLeft, ClipboardList, Paperclip, UserCircle, Image, UploadCloud, User, ChevronDown, ChevronRight, X, ChevronUp, MessageSquarePlus, Info, CheckCircle
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios';
import { useKeycloak } from '../KeycloakProvider';

const ProjectTasks = () => {
  const navigate = useNavigate();
  const { userInfo } = useKeycloak();
  const { id } = useParams();
  const [projectData, setProjectData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [todoTasks, setTodoTasks] = useState([]);
  const [todoExpanded, setTodoExpanded] = useState(true);
  const [doneExpanded, setDoneExpanded] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState(new Set());
  const [activeDropdown, setActiveDropdown] = useState(null); // { taskId, field }
  const [activeDatePicker, setActiveDatePicker] = useState(null); // taskId
  const [activeSubtaskInput, setActiveSubtaskInput] = useState(null); // taskId
  const [newSubtaskName, setNewSubtaskName] = useState('');
  const [activeFilePopover, setActiveFilePopover] = useState(null); // taskId
  const [activeAdminPopover, setActiveAdminPopover] = useState(null); // taskId
  const [expandedTasks, setExpandedTasks] = useState(new Set()); // set of parent taskIds that are expanded

  const getDefaultTasks = () => [
    {
      id: 'task-1',
      name: 'Tâche 1',
      admin: 'Chef de projet',
      status: 'En cours',
      priority: 'Faible',
      remarks: 'Points d\'action',
      budget: 100,
      files: [{ url: '', name: 'document1.png' }],
      dueDate: '2026-06-09',
      dueDateRangeStart: '2026-06-09',
      dueDateRangeEnd: '2026-06-10',
      lastUpdated: new Date(Date.now() - 60000).toISOString(),
      subtasks: []
    },
    {
      id: 'task-2',
      name: 'Tâche 2',
      admin: 'Chef de projet',
      status: 'En cours',
      priority: 'Élevé',
      remarks: 'Notes de réunion',
      budget: 1000,
      files: [],
      dueDate: '2026-06-10',
      dueDateRangeStart: '2026-06-11',
      dueDateRangeEnd: '2026-06-12',
      lastUpdated: new Date(Date.now() - 14 * 60000).toISOString(),
      subtasks: [
        {
          id: 'subtask-2-1',
          name: 'Sous-tâche de Tâche 2',
          admin: 'Chef de projet',
          status: 'En cours',
          priority: 'Faible',
          remarks: 'Notes de réunion',
          budget: 0,
          files: [],
          dueDate: '2026-06-10',
          dueDateRangeStart: '2026-06-11',
          dueDateRangeEnd: '2026-06-12',
          lastUpdated: new Date().toISOString()
        }
      ]
    },
    {
      id: 'task-3',
      name: 'Tâche 3',
      admin: 'Chef de projet',
      status: 'Bloqué',
      priority: 'Moyenne',
      remarks: 'Autre',
      budget: 500,
      files: [],
      dueDate: '2026-06-11',
      dueDateRangeStart: '2026-06-13',
      dueDateRangeEnd: '2026-06-14',
      lastUpdated: new Date(Date.now() - 14 * 60000).toISOString(),
      subtasks: []
    }
  ];

  useEffect(() => {
    if (id) {
      setLoading(true);
      api.get(`/projets/${id}`)
        .then(res => {
          const p = res.data;
          setProjectData(p);
          if (p.todoList) {
            try {
              setTodoTasks(JSON.parse(p.todoList));
            } catch (e) {
              console.error("Erreur parsing todoList", e);
              setTodoTasks(getDefaultTasks());
            }
          } else {
            setTodoTasks(getDefaultTasks());
          }
        })
        .catch(err => setError("Impossible de charger les données du projet: " + err.message))
        .finally(() => setLoading(false));
    }
  }, [id]);

  const handleSave = async () => {
    if (!projectData) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const payload = {
        ...projectData,
        todoList: JSON.stringify(todoTasks)
      };
      
      const res = await api.put(`/projets/${id}`, payload);
      setProjectData(res.data);
      setSuccess("Tâches enregistrées avec succès !");
      setTimeout(() => setSuccess(''), 6000);
    } catch (err) {
      setError("Erreur lors de l'enregistrement des tâches : " + err.message);
    } finally {
      setSaving(false);
    }
  };

  // ── DATE & TIME UTILS ───────────────────────────────────────────────────

  const formatDateFr = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    const monthsFr = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
    return `${monthsFr[date.getMonth()]} ${date.getDate()}`;
  };

  const formatDateRangeFr = (startStr, endStr) => {
    if (!startStr) return '-';
    const start = new Date(startStr);
    if (isNaN(start.getTime())) return startStr;
    const monthsFr = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
    
    if (!endStr) return `${monthsFr[start.getMonth()]} ${start.getDate()}`;
    const end = new Date(endStr);
    if (isNaN(end.getTime())) return `${monthsFr[start.getMonth()]} ${start.getDate()} - ${endStr}`;
    
    if (start.getMonth() === end.getMonth()) {
      return `${monthsFr[start.getMonth()]} ${start.getDate()} - ${end.getDate()}`;
    } else {
      return `${monthsFr[start.getMonth()]} ${start.getDate()} - ${monthsFr[end.getMonth()]} ${end.getDate()}`;
    }
  };

  const isPastDate = (dateStr) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return false;
    const today = new Date();
    today.setHours(0,0,0,0);
    return d < today;
  };

  const getTimeElapsed = (dateStr) => {
    if (!dateStr) return 'non modifié';
    const updatedDate = new Date(dateStr);
    const now = new Date();
    const diffMs = now - updatedDate;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'il y a quelques secondes';
    if (diffMins < 60) return `il y a ${diffMins} min...`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `il y a ${diffHours} h`;
    const diffDays = Math.floor(diffHours / 24);
    return `il y a ${diffDays} j`;
  };

  const getOverallRange = (tasks) => {
    if (!tasks || tasks.length === 0) return '-';
    let minDate = null;
    let maxDate = null;
    tasks.forEach(t => {
      const dates = [t.dueDate, t.dueDateRangeStart, t.dueDateRangeEnd].filter(Boolean);
      dates.forEach(d => {
        const parsed = new Date(d);
        if (!isNaN(parsed.getTime())) {
          if (!minDate || parsed < minDate) minDate = parsed;
          if (!maxDate || parsed > maxDate) maxDate = parsed;
        }
      });
    });
    if (!minDate || !maxDate) return '-';
    
    const monthsFr = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
    const minDay = minDate.getDate();
    const minMonth = monthsFr[minDate.getMonth()];
    const maxDay = maxDate.getDate();
    const maxMonth = monthsFr[maxDate.getMonth()];
    
    if (minDate.getMonth() === maxDate.getMonth()) {
      if (minDay === maxDay) return `${minMonth} ${minDay}`;
      return `${minMonth} ${minDay} - ${maxDay}`;
    } else {
      return `${minMonth} ${minDay} - ${maxMonth} ${maxDay}`;
    }
  };

  // ── TASK OPERATIONS ────────────────────────────────────────────────────

  const handleAddTask = (section) => {
    const newTask = {
      id: 'task-' + Date.now() + Math.random().toString(36).substr(2, 9),
      name: 'Nouvelle tâche',
      admin: 'Chef de projet',
      status: section === 'done' ? 'Fait' : 'En cours',
      priority: 'Faible',
      remarks: '',
      budget: 0,
      files: [],
      dueDate: new Date().toISOString().split('T')[0],
      dueDateRangeStart: new Date().toISOString().split('T')[0],
      dueDateRangeEnd: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      lastUpdated: new Date().toISOString(),
      subtasks: []
    };
    setTodoTasks([...todoTasks, newTask]);
  };

  const handleUpdateTaskField = (taskId, field, value) => {
    setTodoTasks(prevTasks => prevTasks.map(t => {
      if (t.id === taskId) {
        return {
          ...t,
          [field]: value,
          lastUpdated: new Date().toISOString()
        };
      }
      if (t.subtasks && t.subtasks.some(st => st.id === taskId)) {
        return {
          ...t,
          lastUpdated: new Date().toISOString(),
          subtasks: t.subtasks.map(st => st.id === taskId ? { ...st, [field]: value, lastUpdated: new Date().toISOString() } : st)
        };
      }
      return t;
    }));
  };

  const handleDeleteTask = (taskId) => {
    setTodoTasks(prevTasks => prevTasks.filter(t => {
      if (t.id === taskId) return false;
      if (t.subtasks) {
        t.subtasks = t.subtasks.filter(st => st.id !== taskId);
      }
      return true;
    }));
  };

  const handleToggleSelectTask = (taskId) => {
    const newSelected = new Set(selectedTasks);
    if (newSelected.has(taskId)) {
      newSelected.delete(taskId);
    } else {
      newSelected.add(taskId);
    }
    setSelectedTasks(newSelected);
  };

  const handleToggleSelectAll = (tasksInGroup) => {
    const taskIds = tasksInGroup.flatMap(t => [t.id, ...(t.subtasks || []).map(st => st.id)]);
    const allSelected = taskIds.length > 0 && taskIds.every(id => selectedTasks.has(id));
    const newSelected = new Set(selectedTasks);
    if (allSelected) {
      taskIds.forEach(id => newSelected.delete(id));
    } else {
      taskIds.forEach(id => newSelected.add(id));
    }
    setSelectedTasks(newSelected);
  };

  const toggleTaskExpand = (taskId) => {
    const newExpanded = new Set(expandedTasks);
    if (newExpanded.has(taskId)) {
      newExpanded.delete(taskId);
    } else {
      newExpanded.add(taskId);
    }
    setExpandedTasks(newExpanded);
  };

  // ── RENDERS ────────────────────────────────────────────────────────────

  const renderStatusAlertIcon = (status) => {
    switch (status) {
      case 'En cours':
        return <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />;
      case 'Fait':
        return <Check className="w-5 h-5 text-green-500 shrink-0" />;
      case 'Bloqué':
        return <Clock className="w-5 h-5 text-slate-400 shrink-0" />;
      default:
        return null;
    }
  };

  const renderDatePickerPopover = (task) => {
    if (activeDatePicker !== task.id) return null;
    return (
      <>
        <div className="fixed inset-0 z-20" onClick={() => setActiveDatePicker(null)} />
        <div className="absolute z-30 top-full left-1/2 -translate-x-1/2 mt-1 p-3.5 bg-white border border-slate-200 rounded-xl shadow-xl flex flex-col gap-2.5 w-52 text-slate-800 text-left">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Échéance</span>
            <input
              type="date"
              value={task.dueDate || ''}
              onChange={(e) => handleUpdateTaskField(task.id, 'dueDate', e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>
          <div className="border-t border-slate-100 my-1" />
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Début Échéancier</span>
            <input
              type="date"
              value={task.dueDateRangeStart || ''}
              onChange={(e) => handleUpdateTaskField(task.id, 'dueDateRangeStart', e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Fin Échéancier</span>
            <input
              type="date"
              value={task.dueDateRangeEnd || ''}
              onChange={(e) => handleUpdateTaskField(task.id, 'dueDateRangeEnd', e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>
          <button
            onClick={() => setActiveDatePicker(null)}
            className="bg-slate-800 text-white rounded-lg text-xs py-1.5 font-semibold hover:bg-slate-900 transition-colors shadow-sm"
          >
            Fermer
          </button>
        </div>
      </>
    );
  };

  const renderTaskRow = (task, isSubtask = false, parentId = null) => {
    const isSelected = selectedTasks.has(task.id);
    const hasSubtasks = !isSubtask && task.subtasks && task.subtasks.length > 0;
    const isExpanded = expandedTasks.has(task.id);
    
    let statusBg = 'bg-amber-500 text-white';
    if (task.status === 'Fait') statusBg = 'bg-emerald-500 text-white';
    else if (task.status === 'Bloqué') statusBg = 'bg-rose-600 text-white';

    let priorityBg = 'bg-sky-500 text-white';
    if (task.priority === 'Moyenne') priorityBg = 'bg-blue-600 text-white';
    else if (task.priority === 'Élevé') priorityBg = 'bg-violet-700 text-white';

    const singleDateText = formatDateFr(task.dueDate);
    let singleDateBg = 'bg-blue-500 text-white';
    if (task.status === 'Fait') singleDateBg = 'bg-emerald-500 text-white';
    else if (isPastDate(task.dueDate)) singleDateBg = 'bg-neutral-800 text-slate-200';

    const rangeDateText = formatDateRangeFr(task.dueDateRangeStart, task.dueDateRangeEnd);
    let rangeDateBg = 'bg-blue-500 text-white';
    let hasCheck = false;
    if (task.status === 'Fait') {
      rangeDateBg = 'bg-emerald-500 text-white';
      hasCheck = true;
    } else if (isPastDate(task.dueDateRangeEnd || task.dueDate)) {
      rangeDateBg = 'bg-neutral-800 text-slate-200';
    }

    return (
      <tr 
        key={task.id} 
        className={`hover:bg-slate-50/80 transition-colors border-b border-slate-100 ${
          task.status === 'Fait' ? 'border-l-[6px] border-emerald-500' : 'border-l-[6px] border-blue-500'
        }`}
      >
        <td className="px-3 py-2.5 text-center align-middle">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => handleToggleSelectTask(task.id)}
            className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer"
          />
        </td>

        <td className="px-3 py-2.5 align-middle">
          <div className="flex items-center gap-2" style={{ paddingLeft: isSubtask ? '24px' : '0px' }}>
            {isSubtask && <span className="text-slate-400 font-mono select-none">└─</span>}
            
            {hasSubtasks ? (
              <button 
                onClick={() => toggleTaskExpand(task.id)}
                className="text-slate-500 hover:text-slate-800 p-0.5"
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </button>
            ) : !isSubtask ? (
              <span className="w-5" />
            ) : null}

            <input
              type="text"
              value={task.name || ''}
              onChange={(e) => handleUpdateTaskField(task.id, 'name', e.target.value)}
              className="text-sm font-semibold text-slate-700 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:bg-white px-1 py-0.5 rounded outline-none w-full min-w-[150px]"
            />

            {!isSubtask && (
              <button
                onClick={() => setActiveSubtaskInput(activeSubtaskInput === task.id ? null : task.id)}
                className="p-1 rounded bg-slate-100 hover:bg-indigo-50 text-slate-500 hover:text-indigo-600 transition-all border border-slate-200 hover:border-indigo-200"
                title="Ajouter une sous-tâche"
              >
                <MessageSquarePlus className="w-4 h-4" />
              </button>
            )}
          </div>
          
          {!isSubtask && activeSubtaskInput === task.id && (
            <div className="flex items-center gap-1.5 mt-2 ml-7" onClick={(e) => e.stopPropagation()}>
              <input
                type="text"
                placeholder="Nom de la sous-tâche..."
                value={newSubtaskName}
                onChange={(e) => setNewSubtaskName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (newSubtaskName.trim()) {
                      const st = {
                        id: 'subtask-' + Date.now() + Math.random().toString(36).substr(2, 9),
                        name: newSubtaskName.trim(),
                        admin: task.admin || 'Chef de projet',
                        status: 'En cours',
                        priority: 'Faible',
                        remarks: '',
                        budget: 0,
                        files: [],
                        dueDate: task.dueDate,
                        dueDateRangeStart: task.dueDateRangeStart,
                        dueDateRangeEnd: task.dueDateRangeEnd,
                        lastUpdated: new Date().toISOString()
                      };
                      handleUpdateTaskField(task.id, 'subtasks', [...(task.subtasks || []), st]);
                      setNewSubtaskName('');
                      setActiveSubtaskInput(null);
                      const newExpanded = new Set(expandedTasks);
                      newExpanded.add(task.id);
                      setExpandedTasks(newExpanded);
                    }
                  } else if (e.key === 'Escape') {
                    setActiveSubtaskInput(null);
                  }
                }}
                className="border border-slate-200 rounded-lg px-2.5 py-1 text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white text-slate-800 w-full max-w-[200px]"
                autoFocus
              />
              <button
                onClick={() => {
                  if (newSubtaskName.trim()) {
                    const st = {
                      id: 'subtask-' + Date.now() + Math.random().toString(36).substr(2, 9),
                      name: newSubtaskName.trim(),
                      admin: task.admin || 'Chef de projet',
                      status: 'En cours',
                      priority: 'Faible',
                      remarks: '',
                      budget: 0,
                      files: [],
                      dueDate: task.dueDate,
                      dueDateRangeStart: task.dueDateRangeStart,
                      dueDateRangeEnd: task.dueDateRangeEnd,
                      lastUpdated: new Date().toISOString()
                    };
                    handleUpdateTaskField(task.id, 'subtasks', [...(task.subtasks || []), st]);
                    setNewSubtaskName('');
                    setActiveSubtaskInput(null);
                    const newExpanded = new Set(expandedTasks);
                    newExpanded.add(task.id);
                    setExpandedTasks(newExpanded);
                  }
                }}
                className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold rounded-lg transition-colors shadow-sm"
              >
                Ajouter
              </button>
            </div>
          )}
        </td>

        <td className="px-3 py-2.5 text-center align-middle relative">
          <button
            onClick={() => setActiveAdminPopover(activeAdminPopover === task.id ? null : task.id)}
            className="w-8 h-8 rounded-full border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 flex items-center justify-center text-slate-500 hover:text-indigo-600 transition-colors mx-auto"
            title={`Assigné à : ${task.admin || 'Non attribué'}`}
          >
            <UserCircle className="w-5 h-5" />
          </button>
          
          {activeAdminPopover === task.id && (
            <>
              <div className="fixed inset-0 z-20" onClick={() => setActiveAdminPopover(null)} />
              <div className="absolute z-30 top-full left-1/2 -translate-x-1/2 mt-1 p-2 bg-white border border-slate-200 rounded-xl shadow-xl w-48 text-slate-800 text-left">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2.5 py-1 mb-1">Attribuer à</h4>
                <div className="max-h-40 overflow-y-auto space-y-0.5">
                  <button
                    onClick={() => { handleUpdateTaskField(task.id, 'admin', 'Charaf Bentefrit'); setActiveAdminPopover(null); }}
                    className="w-full text-left px-2 py-1.5 hover:bg-slate-50 rounded-lg flex items-center gap-2 transition-colors"
                  >
                    <div className="w-5 h-5 rounded-full bg-slate-800 text-white font-bold text-[9px] flex items-center justify-center">CB</div>
                    <span>Charaf Bentefrit</span>
                  </button>
                  {projectData?.nomChefDeProjet && projectData?.nomChefDeProjet !== 'Charaf Bentefrit' && (
                    <button
                      onClick={() => { handleUpdateTaskField(task.id, 'admin', projectData.nomChefDeProjet); setActiveAdminPopover(null); }}
                      className="w-full text-left px-2 py-1.5 hover:bg-slate-50 rounded-lg flex items-center gap-2 transition-colors"
                    >
                      <div className="w-5 h-5 rounded-full bg-indigo-500 text-white font-bold text-[9px] flex items-center justify-center">
                        {projectData.nomChefDeProjet.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </div>
                      <span>{projectData.nomChefDeProjet}</span>
                    </button>
                  )}
                  {projectData?.chefDeProjet && projectData.chefDeProjet.map((chef) => {
                    const name = `${chef.prenom || ''} ${chef.nom || ''}`.trim();
                    if (name === 'Charaf Bentefrit' || name === projectData.nomChefDeProjet) return null;
                    const initials = `${chef.prenom?.[0] || ''}${chef.nom?.[0] || ''}`.toUpperCase();
                    return (
                      <button
                        key={chef.id}
                        onClick={() => { handleUpdateTaskField(task.id, 'admin', name); setActiveAdminPopover(null); }}
                        className="w-full text-left px-2 py-1.5 hover:bg-slate-50 rounded-lg flex items-center gap-2 transition-colors"
                      >
                        <div className="w-5 h-5 rounded-full bg-emerald-500 text-white font-bold text-[9px] flex items-center justify-center">
                          {initials}
                        </div>
                        <span>{name} (Chef)</span>
                      </button>
                    );
                  })}
                  {projectData?.membres && projectData.membres.map((memb) => {
                    const name = `${memb.prenom || ''} ${memb.nom || ''}`.trim();
                    if (name === 'Charaf Bentefrit' || name === projectData.nomChefDeProjet || projectData.chefDeProjet?.some(c => `${c.prenom || ''} ${c.nom || ''}`.trim() === name)) return null;
                    const initials = `${memb.prenom?.[0] || ''}${memb.nom?.[0] || ''}`.toUpperCase();
                    return (
                      <button
                        key={memb.id}
                        onClick={() => { handleUpdateTaskField(task.id, 'admin', name); setActiveAdminPopover(null); }}
                        className="w-full text-left px-2 py-1.5 hover:bg-slate-50 rounded-lg flex items-center gap-2 transition-colors"
                      >
                        <div className="w-5 h-5 rounded-full bg-primary-600 text-white font-bold text-[9px] flex items-center justify-center">{initials}</div>
                        <span>{name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </td>

        <td className="px-3 py-2.5 align-middle relative">
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => setActiveDropdown({ taskId: task.id, field: 'status' })}
              className={`w-28 text-center px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm transition-all hover:opacity-90 ${statusBg}`}
            >
              {task.status}
            </button>
            {renderStatusAlertIcon(task.status)}
          </div>

          {activeDropdown && activeDropdown.taskId === task.id && activeDropdown.field === 'status' && (
            <>
              <div className="fixed inset-0 z-20" onClick={() => setActiveDropdown(null)} />
              <div className="absolute z-35 top-full left-1/2 -translate-x-1/2 mt-1 w-32 bg-white border border-slate-200 rounded-xl shadow-xl py-1.5 text-xs text-slate-800 text-left">
                <button
                  onClick={() => { handleUpdateTaskField(task.id, 'status', 'En cours'); setActiveDropdown(null); }}
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2 transition-colors font-medium text-slate-700"
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <span>En cours</span>
                </button>
                <button
                  onClick={() => { handleUpdateTaskField(task.id, 'status', 'Fait'); setActiveDropdown(null); }}
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2 transition-colors font-medium text-slate-700"
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span>Fait</span>
                </button>
                <button
                  onClick={() => { handleUpdateTaskField(task.id, 'status', 'Bloqué'); setActiveDropdown(null); }}
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2 transition-colors font-medium text-slate-700"
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-600" />
                  <span>Bloqué</span>
                </button>
              </div>
            </>
          )}
        </td>

        <td className="px-3 py-2.5 text-center align-middle relative">
          <button
            onClick={() => setActiveDatePicker(task.id)}
            className={`px-3 py-1.5 rounded-full text-[11px] font-bold shadow-sm transition-all hover:opacity-90 inline-block ${singleDateBg}`}
          >
            {singleDateText}
          </button>
          {renderDatePickerPopover(task)}
        </td>

        <td className="px-3 py-2.5 align-middle relative">
          <button
            onClick={() => setActiveDropdown({ taskId: task.id, field: 'priority' })}
            className={`w-24 text-center px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm transition-all hover:opacity-90 ${priorityBg}`}
          >
            {task.priority}
          </button>

          {activeDropdown && activeDropdown.taskId === task.id && activeDropdown.field === 'priority' && (
            <>
              <div className="fixed inset-0 z-20" onClick={() => setActiveDropdown(null)} />
              <div className="absolute z-35 top-full left-1/2 -translate-x-1/2 mt-1 w-32 bg-white border border-slate-200 rounded-xl shadow-xl py-1.5 text-xs text-slate-800 text-left">
                <button
                  onClick={() => { handleUpdateTaskField(task.id, 'priority', 'Faible'); setActiveDropdown(null); }}
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2 transition-colors font-medium text-slate-700"
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
                  <span>Faible</span>
                </button>
                <button
                  onClick={() => { handleUpdateTaskField(task.id, 'priority', 'Moyenne'); setActiveDropdown(null); }}
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2 transition-colors font-medium text-slate-700"
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                  <span>Moyenne</span>
                </button>
                <button
                  onClick={() => { handleUpdateTaskField(task.id, 'priority', 'Élevé'); setActiveDropdown(null); }}
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2 transition-colors font-medium text-slate-700"
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-violet-700" />
                  <span>Élevé</span>
                </button>
              </div>
            </>
          )}
        </td>

        <td className="px-3 py-2.5 align-middle">
          <input
            type="text"
            value={task.remarks || ''}
            onChange={(e) => handleUpdateTaskField(task.id, 'remarks', e.target.value)}
            className="text-xs text-slate-700 bg-transparent border-b border-transparent hover:border-slate-200 focus:border-indigo-500 focus:bg-white rounded px-2 py-1 outline-none w-full min-w-[120px]"
            placeholder="Saisir une remarque..."
          />
        </td>

        <td className="px-3 py-2.5 text-center align-middle font-bold text-slate-800">
          <div className="flex items-center justify-center gap-0.5 border-b border-transparent hover:border-slate-200 focus-within:border-indigo-500 focus-within:bg-white rounded px-1.5 py-0.5">
            <input
              type="number"
              value={task.budget === 0 ? '' : task.budget}
              onChange={(e) => handleUpdateTaskField(task.id, 'budget', e.target.value === '' ? 0 : Number(e.target.value))}
              className="text-xs text-slate-800 bg-transparent outline-none w-16 text-center font-bold"
              placeholder="0"
            />
            <span className="text-[10px] text-slate-400 font-semibold">MAD</span>
          </div>
        </td>

        <td className="px-3 py-2.5 text-center align-middle relative">
          {task.files && task.files.length > 0 ? (
            <button
              onClick={() => setActiveFilePopover(activeFilePopover === task.id ? null : task.id)}
              className="p-1.5 rounded bg-blue-50 text-blue-500 hover:bg-blue-100 hover:text-blue-600 transition-colors inline-block"
              title={`${task.files.length} fichiers joints`}
            >
              <Image className="w-4.5 h-4.5" />
            </button>
          ) : (
            <button
              onClick={() => setActiveFilePopover(activeFilePopover === task.id ? null : task.id)}
              className="p-1.5 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors inline-block"
              title="Attacher des fichiers"
            >
              <Paperclip className="w-4 h-4" />
            </button>
          )}

          {activeFilePopover === task.id && (
            <>
              <div className="fixed inset-0 z-20" onClick={() => setActiveFilePopover(null)} />
              <div className="absolute z-30 top-full right-0 mt-1 p-3.5 bg-white border border-slate-200 rounded-xl shadow-xl w-64 text-slate-800 text-left">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Pièces jointes</h4>
                
                {task.files && task.files.length > 0 ? (
                  <div className="space-y-1.5 max-h-32 overflow-y-auto mb-3 pr-1">
                    {task.files.map((file, fIdx) => (
                      <div key={fIdx} className="flex items-center justify-between gap-2 p-1.5 bg-slate-50 border border-slate-100 rounded-lg text-xs">
                        <a
                          href={file.url ? (api.defaults.baseURL.replace('/api', '') + file.url) : '#'}
                          target="_blank"
                          rel="noreferrer"
                          className="text-indigo-600 hover:underline truncate flex-1 pr-1 font-semibold"
                          title={file.name}
                        >
                          {file.name}
                        </a>
                        <button
                          onClick={() => {
                            const updatedFiles = task.files.filter((_, i) => i !== fIdx);
                            handleUpdateTaskField(task.id, 'files', updatedFiles);
                          }}
                          className="text-slate-400 hover:text-red-500 transition-colors p-0.5"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic mb-3">Aucun fichier joint.</p>
                )}

                <div className="relative">
                  <input
                    type="file"
                    id={`task-file-uploader-${task.id}`}
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files[0];
                      if (!file) return;
                      const formData = new FormData();
                      formData.append('file', file);
                      try {
                        const res = await api.post('/files/upload', formData, {
                          headers: { 'Content-Type': 'multipart/form-data' },
                        });
                        const { fileUrl, fileName } = res.data;
                        const updatedFiles = [...(task.files || []), { url: fileUrl, name: fileName }];
                        handleUpdateTaskField(task.id, 'files', updatedFiles);
                      } catch (err) {
                        console.error("Erreur d'envoi", err);
                      }
                    }}
                  />
                  <button
                    onClick={() => document.getElementById(`task-file-uploader-${task.id}`).click()}
                    className="w-full bg-slate-800 text-white rounded-lg text-xs py-1.5 font-semibold hover:bg-slate-900 transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <UploadCloud className="w-3.5 h-3.5" />
                    Ajouter un fichier
                  </button>
                </div>
              </div>
            </>
          )}
        </td>

        <td className="px-3 py-2.5 text-center align-middle relative">
          <button
            onClick={() => setActiveDatePicker(task.id)}
            className={`px-3 py-1.5 rounded-full text-[11px] font-bold shadow-sm transition-all hover:opacity-90 inline-flex items-center gap-1.5 ${rangeDateBg}`}
          >
            {hasCheck && <Check className="w-3.5 h-3.5" />}
            <span>{rangeDateText}</span>
          </button>
        </td>

        <td className="px-3 py-2.5 align-middle text-slate-500 text-xs text-center">
          <div className="flex items-center gap-2 justify-center">
            <div className="w-6 h-6 rounded-full bg-slate-950 text-white flex items-center justify-center shrink-0">
              <User className="w-3.5 h-3.5 fill-white text-white" />
            </div>
            <span className="truncate max-w-[100px]">{getTimeElapsed(task.lastUpdated)}</span>
          </div>
        </td>

        <td className="px-3 py-2.5 text-center align-middle">
          <button
            onClick={() => handleDeleteTask(task.id)}
            className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
            title="Supprimer la tâche"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </td>
      </tr>
    );
  };

  const renderTachesTable = (tasksInGroup, sectionId) => {
    const isExpanded = sectionId === 'todo' ? todoExpanded : doneExpanded;
    const setExpanded = sectionId === 'todo' ? setTodoExpanded : setDoneExpanded;
    const sectionTitle = sectionId === 'todo' ? 'To-do' : 'Terminé';
    const titleColorClass = sectionId === 'todo' ? 'text-blue-500 border-blue-500' : 'text-emerald-500 border-emerald-500';
    
    const groupTaskIds = tasksInGroup.flatMap(t => [t.id, ...(t.subtasks || []).map(st => st.id)]);
    const allSelected = groupTaskIds.length > 0 && groupTaskIds.every(id => selectedTasks.has(id));

    const isDoneEmpty = sectionId === 'done' && tasksInGroup.length === 0;
    const budgetSum = isDoneEmpty ? 0 : tasksInGroup.reduce((sum, t) => sum + (t.budget || 0), 0);
    const filesCount = isDoneEmpty ? 0 : tasksInGroup.reduce((count, t) => count + ((t.files && t.files.length) || 0), 0);
    const rangeText = getOverallRange(tasksInGroup);

    return (
      <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-white mb-6 transition-all duration-300">
        <div 
          onClick={() => setExpanded(!isExpanded)}
          className="flex items-center justify-between px-5 py-3.5 bg-slate-50 border-b border-slate-200 cursor-pointer select-none"
        >
          <div className="flex items-center gap-3">
            <button className="p-1 rounded-md hover:bg-slate-200 transition-colors text-slate-500">
              {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
            </button>
            <h3 className={`text-base font-bold ${titleColorClass}`}>
              {sectionTitle}
            </h3>
            <span className="bg-slate-200 text-slate-700 text-xs px-2 py-0.5 rounded-full font-bold">
              {tasksInGroup.length}
            </span>
          </div>
        </div>

        {isExpanded && (
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse min-w-[1200px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs font-bold">
                  <th className="px-3 py-3 w-12 text-center align-middle">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={() => handleToggleSelectAll(tasksInGroup)}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer"
                    />
                  </th>
                  <th className="px-3 py-3 min-w-[200px] align-middle">Tâche</th>
                  <th className="px-3 py-3 w-16 text-center align-middle">Admin</th>
                  <th className="px-3 py-3 w-36 text-center align-middle relative group">
                    <div className="inline-flex items-center gap-1">
                      <span>Statut</span>
                      <Info className="w-3.5 h-3.5 text-slate-400 cursor-help" />
                    </div>
                  </th>
                  <th className="px-3 py-3 w-32 text-center align-middle relative group">
                    <div className="inline-flex items-center gap-1">
                      <span>Échéance</span>
                      <Info className="w-3.5 h-3.5 text-slate-400 cursor-help" />
                    </div>
                  </th>
                  <th className="px-3 py-3 w-32 text-center align-middle">Priorité</th>
                  <th className="px-3 py-3 min-w-[150px] align-middle">Remarques</th>
                  <th className="px-3 py-3 w-28 text-center align-middle">Budget</th>
                  <th className="px-3 py-3 w-24 text-center align-middle">Fichiers</th>
                  <th className="px-3 py-3 w-36 text-center align-middle relative group">
                    <div className="inline-flex items-center gap-1">
                      <span>Échéancier</span>
                      <Info className="w-3.5 h-3.5 text-slate-400 cursor-help" />
                    </div>
                  </th>
                  <th className="px-3 py-3 w-44 text-center align-middle">Dernière mise à jour</th>
                  <th className="px-3 py-3 w-16 text-center align-middle"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {tasksInGroup.map(task => (
                  <Fragment key={task.id}>
                    {renderTaskRow(task)}
                    {task.subtasks && expandedTasks.has(task.id) && task.subtasks.map(st => (
                      renderTaskRow(st, true, task.id)
                    ))}
                  </Fragment>
                ))}

                {tasksInGroup.length === 0 && (
                  <tr>
                    <td colSpan={12} className="px-5 py-8 text-center text-slate-400 italic text-sm">
                      Aucune tâche dans cette section.
                    </td>
                  </tr>
                )}

                <tr className="bg-slate-50/50">
                  <td className="px-3 py-2 text-center"></td>
                  <td colSpan={11} className="px-3 py-2">
                    <button
                      onClick={() => handleAddTask(sectionId)}
                      className="text-indigo-600 hover:text-indigo-800 text-xs font-bold flex items-center gap-1 py-1"
                    >
                      <Plus className="w-4 h-4" />
                      Ajouter tâche
                    </button>
                  </td>
                </tr>
              </tbody>

              <tfoot>
                <tr className={`bg-slate-100/80 border-t border-slate-200 font-bold text-slate-700 text-xs ${
                  sectionId === 'todo' ? 'border-l-[6px] border-blue-500' : 'border-l-[6px] border-emerald-500'
                }`}>
                  <td className="px-3 py-3.5"></td>
                  <td className="px-3 py-3.5 text-left text-slate-500 uppercase tracking-wider font-extrabold">
                    Synthèse
                  </td>
                  <td className="px-3 py-3.5"></td>
                  
                  <td className="px-3 py-3.5 align-middle">
                    <div className="flex items-center justify-center">
                      <div className="flex w-16 h-3.5 rounded overflow-hidden shadow-inner border border-slate-200">
                        <div className="flex-1 bg-emerald-500" title="Fait" />
                        <div className="flex-1 bg-amber-500" title="En cours" />
                        <div className="flex-1 bg-rose-600" title="Bloqué" />
                      </div>
                    </div>
                  </td>

                  <td className="px-3 py-3.5 text-center align-middle">
                    {rangeText !== '-' ? (
                      <span className="px-3 py-1 bg-slate-800 text-white rounded-full font-bold text-[10px] shadow-sm tracking-wide">
                        {rangeText}
                      </span>
                    ) : (
                      <span className="px-3 py-1 bg-slate-300 text-slate-500 rounded-full font-bold text-[10px]">
                        -
                      </span>
                    )}
                  </td>

                  <td className="px-3 py-3.5 align-middle">
                    <div className="flex items-center justify-center">
                      <div className="flex w-16 h-3.5 rounded overflow-hidden shadow-inner border border-slate-200">
                        <div className="flex-1 bg-sky-500" title="Faible" />
                        <div className="flex-1 bg-blue-600" title="Moyenne" />
                        <div className="flex-1 bg-violet-700" title="Élevé" />
                      </div>
                    </div>
                  </td>

                  <td className="px-3 py-3.5"></td>

                  <td className="px-3 py-3.5 text-center align-middle font-black text-slate-800 text-[13px]">
                    <div className="flex flex-col items-center">
                      <span>{budgetSum.toLocaleString()} MAD</span>
                      <span className="text-[9px] text-slate-400 uppercase tracking-widest font-normal -mt-0.5">Somme</span>
                    </div>
                  </td>

                  <td className="px-3 py-3.5 text-center align-middle text-slate-700">
                    <div className="flex flex-col items-center">
                      <span>{filesCount}</span>
                      <span className="text-[9px] text-slate-400 uppercase tracking-widest font-normal -mt-0.5">fichiers</span>
                    </div>
                  </td>

                  <td className="px-3 py-3.5"></td>
                  <td className="px-3 py-3.5"></td>
                  <td className="px-3 py-3.5"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-600 font-semibold">
        Chargement de la gestion des tâches...
      </div>
    );
  }

  const todoGroup = todoTasks.filter(t => t.status !== 'Fait');
  const doneGroup = todoTasks.filter(t => t.status === 'Fait');

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between bg-white p-6 rounded-2xl border border-slate-200 shadow-sm gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-slate-400">
            <button
              onClick={() => navigate(`/projects/edit/${id}`)}
              className="flex items-center gap-1.5 text-sm font-semibold text-primary-600 hover:text-primary-800 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Retour au projet
            </button>
          </div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2.5">
            <ClipboardList className="w-7 h-7 text-primary-600" />
            Gestion des tâches
          </h2>
          {projectData && (
            <p className="text-slate-500 font-medium text-sm">
              Projet : <span className="text-slate-800 font-bold bg-slate-100 px-2 py-0.5 rounded mr-1.5">{projectData.code}</span> 
              <span className="text-primary-700 font-semibold">{projectData.nom}</span>
            </p>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/projects/edit/${id}`)}
            className="flex items-center gap-2 px-4 py-2.5 border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 font-medium rounded-lg transition-colors shadow-sm text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Fermer / Retour
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 text-white font-medium rounded-lg transition-colors shadow-sm text-sm"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Enregistrement...' : 'Enregistrer les modifications'}
          </button>
        </div>
      </div>

      {success && (
        <div className="p-3.5 bg-green-50 border border-green-200 text-green-800 rounded-xl flex items-center justify-between gap-2 shadow-sm animate-fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
            <span className="text-sm font-semibold">{success}</span>
          </div>
          <button onClick={() => setSuccess('')} className="text-green-500 hover:text-green-800 p-0.5 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="p-3.5 bg-red-50 border border-red-200 text-red-800 rounded-xl flex items-center justify-between gap-2 shadow-sm animate-fade-in">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            <span className="text-sm font-semibold">{error}</span>
          </div>
          <button onClick={() => setError('')} className="text-red-500 hover:text-red-800 p-0.5 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Board */}
      <div className="space-y-6">
        {renderTachesTable(todoGroup, 'todo')}
        {renderTachesTable(doneGroup, 'done')}
      </div>
    </div>
  );
};

export default ProjectTasks;
