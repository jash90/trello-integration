import React, { useState, useEffect } from 'react';
import { ListPlus, Loader2, Users, PencilLine, FileJson, Sparkles, ArrowLeft, ChevronDown, Check, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getBoards, getLists, getBoardMembers, BASE_URL } from '../lib/trello';
import { generateTaskDescription } from '../lib/openai';
import { ModelSelector } from '../components/ModelSelector';
import type { TrelloBoard, TrelloList, TrelloMember, TrelloCard } from '../types/trello';
import toast from 'react-hot-toast';

// Read keys from environment variables
const trelloKey = import.meta.env.VITE_TRELLO_KEY;
const trelloToken = import.meta.env.VITE_TRELLO_TOKEN;
const openaiKey = import.meta.env.VITE_OPENAI_KEY;

interface Task {
  name: string;
  description: string;
  members: string[];
}

interface TaskInput {
  title: string;
  description: string;
  members?: string[];
}

function parseTasksFromText(text: string): Task[] {
  try {
    const taskInputs: TaskInput[] = JSON.parse(text);
    return taskInputs.map(input => ({
      name: input.title,
      description: input.description,
      members: input.members || []
    }));
  } catch (err) {
    if (err instanceof Error) {
      throw new Error(`Invalid JSON format: ${err.message}`);
    }
    throw new Error('Invalid JSON format');
  }
}

export function Dashboard() {
  const [boards, setBoards] = useState<TrelloBoard[]>([]);
  const [lists, setLists] = useState<TrelloList[]>([]);
  const [members, setMembers] = useState<TrelloMember[]>([]);
  const [selectedBoard, setSelectedBoard] = useState<string>('');
  const [selectedList, setSelectedList] = useState<string>('');
  const [taskText, setTaskText] = useState<string>('');
  const [selectedMember, setSelectedMember] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [prompt, setPrompt] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [taskCount, setTaskCount] = useState<number>(5);
  const [selectedModel, setSelectedModel] = useState(() => 
    localStorage.getItem('selectedModel') || 'o1-preview'
  );
  const [creatingTasks, setCreatingTasks] = useState<Array<{
    name: string;
    status: 'pending' | 'creating' | 'done' | 'error';
    error?: string;
  }>>([]);

  const [activeTab, setActiveTab] = useState<'create' | 'edit' | 'export'>('create');
  const [cards, setCards] = useState<TrelloCard[]>([]);
  const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set());
  const [updatingCards, setUpdatingCards] = useState(false);
  const [exportedJson, setExportedJson] = useState<string>('');
  const [loadingExport, setLoadingExport] = useState(false);

  const loadBoards = async () => {
    if (!trelloKey || !trelloToken) {
      setError('Trello API Key or Token not configured in environment variables.');
      toast.error('Trello API credentials missing');
      return;
    }

    try {
      const boardData = await getBoards(trelloKey, trelloToken);
      setBoards(boardData);
      setError('');
    } catch (error) {
      console.error('Board loading error:', error);
      setError('Failed to load boards. Please check your Trello API credentials in environment variables.');
      toast.error('Failed to load Trello boards');
      setBoards([]);
    }
  };

  async function loadLists(boardId: string) {
    if (!trelloKey || !trelloToken) return;
    try {
      const listData = await getLists(boardId, trelloKey, trelloToken);
      setLists(listData);
    } catch (error) {
      console.error('List loading error:', error);
      setError('Failed to load lists.');
    }
  }

  async function loadMembers(boardId: string) {
    if (!trelloKey || !trelloToken) return;
    try {
      const memberData = await getBoardMembers(boardId, trelloKey, trelloToken);
      setMembers(memberData);
    } catch (error) {
      console.error('Member loading error:', error);
      setError('Failed to load board members.');
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedList || !taskText.trim() || !trelloKey || !trelloToken) return;

    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const validTasks = parseTasksFromText(taskText);
      if (validTasks.length === 0) {
        throw new Error('No valid tasks found in the text. Please check the format.');
      }
      
      // Initialize task status tracking
      setCreatingTasks(validTasks.map(task => ({
        name: task.name,
        status: 'pending'
      })));
      
      // If a member is selected, assign them to all tasks
      if (selectedMember) {
        validTasks.forEach(task => {
          task.members = [selectedMember];
        });
      }

      try {
        for (let i = 0; i < validTasks.length; i++) {
          setCreatingTasks(prev => prev.map((task, index) => 
            index === i ? { ...task, status: 'creating' } : task
          ));
          
          const response = await fetch(`${BASE_URL}/cards?key=${trelloKey}&token=${trelloToken}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              name: validTasks[i].name,
              idList: selectedList,
              desc: validTasks[i].description,
              idMembers: validTasks[i].members,
            }),
          });
          
          if (!response.ok) {
            throw new Error(`Failed to create task: ${validTasks[i].name}`);
          }
          
          await response.json();
          
          setCreatingTasks(prev => prev.map((task, index) => 
            index === i ? { ...task, status: 'done' } : task
          ));
          
          if (i < validTasks.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 50));
          }
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to create task';
        setCreatingTasks(prev => prev.map((task, index) => 
          index === validTasks.findIndex(t => t.name === task.name) 
            ? { ...task, status: 'error', error: errorMessage }
            : task
        ));
        throw err;
      }
      
      setSuccess(`Successfully added ${validTasks.length} tasks to Trello!`);
      toast.success(`Added ${validTasks.length} tasks`);
      setTaskText('');
      setTimeout(() => setCreatingTasks([]), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create tasks. Please try again.');
      toast.error('Failed to create tasks');
    } finally {
      setIsLoading(false);
    }
  }

  async function loadCards(listId: string) {
    if (!trelloKey || !trelloToken) return;
    try {
      const response = await fetch(
        `${BASE_URL}/lists/${listId}/cards?key=${trelloKey}&token=${trelloToken}`
      );
      const data = await response.json();
      setCards(data);
    } catch (error) {
      console.error('Card loading error:', error);
      setError('Failed to load cards.');
    }
  }

  async function handleBulkAssign() {
    if (!selectedMember || selectedCards.size === 0 || !trelloKey || !trelloToken) return;
    
    setUpdatingCards(true);
    setError('');
    setSuccess('');
    
    try {
      const updatePromises = Array.from(selectedCards).map(async (cardId) => {
        const response = await fetch(`${BASE_URL}/cards/${cardId}?key=${trelloKey}&token=${trelloToken}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            idMembers: [selectedMember]
          }),
        });
        
        if (!response.ok) {
          throw new Error(`Failed to update card ${cardId}`);
        }
        
        await new Promise(resolve => setTimeout(resolve, 50));
        return response.json();
      });
      
      await Promise.all(updatePromises);
      setSuccess(`Successfully updated ${selectedCards.size} tasks!`);
      loadCards(selectedList);
      setSelectedCards(new Set());
      setSelectedMember('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update tasks');
    } finally {
      setUpdatingCards(false);
    }
  }

  useEffect(() => {
    loadBoards();
  }, []);

  // Save selected model when it changes
  useEffect(() => {
    localStorage.setItem('selectedModel', selectedModel);
  }, [selectedModel]);

  useEffect(() => {
    if (selectedBoard) {
      loadLists(selectedBoard);
      loadMembers(selectedBoard);
    }
  }, [selectedBoard]);

  useEffect(() => {
    if (selectedList && activeTab === 'edit') {
      loadCards(selectedList);
    } else if (selectedList && activeTab === 'export') {
      exportCards();
    }
  }, [selectedList, activeTab]);

  const exportCards = async () => {
    if (!selectedList || !trelloKey || !trelloToken) return;
    
    setLoadingExport(true);
    setError('');
    
    try {
      const response = await fetch(
        `${BASE_URL}/lists/${selectedList}/cards?key=${trelloKey}&token=${trelloToken}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch cards');
      }
      
      const cards = await response.json();
      
      const formattedCards = cards.map((card: TrelloCard) => ({
        title: card.name,
        description: card.desc
      }));
      
      setExportedJson(JSON.stringify(formattedCards, null, 2));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export cards');
      setExportedJson('');
    } finally {
      setLoadingExport(false);
    }
  };

  const renderBoardSelector = () => (
    <div className="relative">
      <label htmlFor="board" className="block text-sm font-medium text-gray-700 mb-1">
        Select Board
      </label>
      <div className="mt-1 relative rounded-md shadow-sm">
        <select
          id="board"
          className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md transition-all"
          value={selectedBoard}
          onChange={(e) => setSelectedBoard(e.target.value)}
          required
        >
          <option value="">Choose a board...</option>
          {boards.map((board) => (
            <option key={board.id} value={board.id}>
              {board.name}
            </option>
          ))}
        </select>
        <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
          <ChevronDown className="h-4 w-4 text-gray-400" />
        </div>
      </div>
    </div>
  );

  const renderListSelector = () => (
    <div className="relative">
      <label htmlFor="list" className="block text-sm font-medium text-gray-700 mb-1">
        Select List
      </label>
      <div className="mt-1 relative rounded-md shadow-sm">
        <select
          id="list"
          className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md transition-all"
          value={selectedList}
          onChange={(e) => setSelectedList(e.target.value)}
          required
          disabled={!selectedBoard}
        >
          <option value="">Choose a list...</option>
          {lists.map((list) => (
            <option key={list.id} value={list.id}>
              {list.name}
            </option>
          ))}
        </select>
        <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
          <ChevronDown className="h-4 w-4 text-gray-400" />
        </div>
      </div>
    </div>
  );

  const renderMemberSelector = () => (
    <div className="relative">
      <label htmlFor="member" className="block text-sm font-medium text-gray-700 mb-1">
        Assign All Tasks To
      </label>
      <div className="mt-1 relative rounded-md shadow-sm">
        <select
          id="member"
          className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md transition-all"
          value={selectedMember}
          onChange={(e) => setSelectedMember(e.target.value)}
          disabled={!selectedBoard}
        >
          <option value="">No assignment</option>
          {members.map((member) => (
            <option key={member.id} value={member.id}>
              {member.fullName || member.username}
            </option>
          ))}
        </select>
        <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
          <ChevronDown className="h-4 w-4 text-gray-400" />
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center">
            <Link to="/" className="mr-4 p-2 rounded-full hover:bg-gray-200 transition-colors">
              <ArrowLeft className="h-5 w-5 text-gray-500" />
            </Link>
            <div className="flex items-center">
              <ListPlus className="h-8 w-8 text-blue-600" />
              <h1 className="ml-2 text-2xl font-bold text-gray-900">
                Trello Task Creator
              </h1>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {(!trelloKey || !trelloToken || !openaiKey) && (
            <div className="bg-amber-50 px-6 py-4 border-l-4 border-amber-400">
              <div className="flex">
                <div className="flex-shrink-0">
                  <AlertCircle className="h-5 w-5 text-amber-400" />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-amber-700">
                    Please ensure VITE_TRELLO_KEY, VITE_TRELLO_TOKEN, and VITE_OPENAI_KEY are set in your .env file.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="border-b border-gray-200">
            <nav className="px-6 flex space-x-6 overflow-x-auto" aria-label="Tabs">
              {[
                { id: 'create', label: 'Create Tasks', icon: <ListPlus className="w-4 h-4" /> },
                { id: 'edit', label: 'Edit Tasks', icon: <PencilLine className="w-4 h-4" /> },
                { id: 'export', label: 'Export JSON', icon: <FileJson className="w-4 h-4" /> }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as 'create' | 'edit' | 'export')}
                  className={`flex items-center gap-2 px-1 py-4 font-medium text-sm border-b-2 ${
                    activeTab === tab.id
                      ? 'text-blue-600 border-blue-600'
                      : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'
                  } transition-colors`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          <form onSubmit={handleSubmit} className="px-6 py-6 space-y-8">
            {/* Board/List/Member Selection Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-gray-50 p-6 rounded-lg">
              {renderBoardSelector()}
              {renderListSelector()}
              {renderMemberSelector()}
            </div>

            {activeTab === 'create' ? (
              <div className="space-y-6 animate-fadeIn">
                {/* AI Model and Prompt Section */}
                <div className="bg-gray-50 p-6 rounded-lg space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Model
                    </label>
                    <ModelSelector
                      selectedModel={selectedModel}
                      onModelSelect={setSelectedModel}
                    />
                  </div>

                  <div>
                    <label htmlFor="prompt" className="block text-sm font-medium text-gray-700 mb-2">
                      AI Task Generation Prompt
                    </label>
                    <div className="mt-1 flex gap-2">
                      <div className="relative rounded-md shadow-sm flex-1">
                        <input
                          type="text"
                          id="prompt"
                          value={prompt}
                          onChange={(e) => setPrompt(e.target.value)}
                          className="focus:ring-blue-500 focus:border-blue-500 block w-full h-full sm:text-sm border-gray-300 rounded-md"
                          placeholder="Describe the task you want to create..."
                          disabled={!openaiKey}
                        />
                      </div>
                      <div className="flex items-center">
                        <input
                          type="number"
                          value={taskCount}
                          onChange={(e) => setTaskCount(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
                          className="max-w-[80px] rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          placeholder="Count"
                          min="1"
                          max="100"
                          disabled={!openaiKey}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          setIsGenerating(true);
                          setError('');
                          if (!openaiKey) {
                            setError('OpenAI API Key not configured.');
                            setIsGenerating(false);
                            return;
                          }
                          try {
                            const result = await generateTaskDescription(prompt, taskCount, openaiKey);
                            setTaskText(result);
                          } catch (err) {
                            setError(err instanceof Error ? err.message : 'Failed to generate task');
                          } finally {
                            setIsGenerating(false);
                          }
                        }}
                        disabled={!prompt || !openaiKey || isGenerating}
                        className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:bg-purple-300 disabled:cursor-not-allowed transition-colors"
                      >
                        {isGenerating ? (
                          <>
                            <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4 mr-2" />
                            Generate
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Task Input Section */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <label
                      htmlFor="taskText"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Tasks
                    </label>
                    <div className="text-xs text-gray-500 inline-flex items-center">
                      <span>Format: <code className="px-1 py-0.5 bg-gray-100 rounded">JSON</code></span>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-gray-50 rounded-md">
                    <div className="text-sm text-gray-700 mb-2">Example format:</div>
                    <pre className="bg-white p-3 rounded border border-gray-200 text-xs overflow-auto">
{`[{
  "title": "Task 1: Project Setup",
  "description": "Set up the initial project structure..."
}]`}
                    </pre>
                  </div>
                  
                  <div className="mt-1">
                    <textarea
                      id="taskText"
                      className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border border-gray-300 rounded-md font-mono"
                      rows={15}
                      value={taskText}
                      onChange={(e) => setTaskText(e.target.value)}
                      placeholder={JSON.stringify([
                        {
                          title: "Task 1: Project Setup",
                          description: "Description of the task..."
                        }
                      ], null, 2)}
                      required
                    />
                  </div>
                </div>
              </div>
            ) : activeTab === 'edit' ? (
              <div className="space-y-6 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">
                    Tasks in Selected List
                  </h3>
                  <button
                    type="button"
                    onClick={handleBulkAssign}
                    disabled={selectedCards.size === 0 || !selectedMember || updatingCards}
                    className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300 disabled:cursor-not-allowed transition-colors"
                  >
                    {updatingCards ? (
                      <>
                        <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                        Updating...
                      </>
                    ) : (
                      <>
                        <Users className="w-4 h-4 mr-2" />
                        Assign Selected
                      </>
                    )}
                  </button>
                </div>
                
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  {cards.length === 0 ? (
                    <div className="p-6 text-center text-gray-500">
                      {selectedList ? "No cards found in this list" : "Select a list to view cards"}
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-200">
                      {cards.map((card) => (
                        <div
                          key={card.id}
                          className="flex items-center py-4 px-6 hover:bg-gray-50 transition-colors"
                        >
                          <div className="mr-4 flex-shrink-0">
                            <input
                              type="checkbox"
                              checked={selectedCards.has(card.id)}
                              onChange={(e) => {
                                const newSelected = new Set(selectedCards);
                                if (e.target.checked) {
                                  newSelected.add(card.id);
                                } else {
                                  newSelected.delete(card.id);
                                }
                                setSelectedCards(newSelected);
                              }}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {card.name}
                            </p>
                            {card.idMembers.length > 0 && (
                              <p className="text-xs text-gray-500 mt-1 flex items-center">
                                <Users className="h-3 w-3 mr-1" />
                                {members.find(m => m.id === card.idMembers[0])?.fullName || 'Unknown'}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-6 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">
                    Exported Cards JSON
                  </h3>
                  <button
                    type="button"
                    onClick={exportCards}
                    disabled={!selectedList || loadingExport}
                    className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300 disabled:cursor-not-allowed transition-colors"
                  >
                    {loadingExport ? (
                      <>
                        <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                        Exporting...
                      </>
                    ) : (
                      <>
                        <FileJson className="w-4 h-4 mr-2" />
                        Refresh
                      </>
                    )}
                  </button>
                </div>
                
                {loadingExport ? (
                  <div className="p-12 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                  </div>
                ) : exportedJson ? (
                  <pre className="bg-gray-50 p-4 rounded-lg overflow-auto max-h-[400px] text-sm font-mono border border-gray-200">
                    {exportedJson}
                  </pre>
                ) : (
                  <div className="bg-white border border-gray-200 rounded-lg p-12 text-center text-gray-500">
                    Select a list to export cards as JSON
                  </div>
                )}
              </div>
            )}

            {/* Status Messages */}
            {error && (
              <div className="rounded-md bg-red-50 p-4 flex">
                <div className="flex-shrink-0">
                  <AlertCircle className="h-5 w-5 text-red-400" />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            )}

            {success && (
              <div className="rounded-md bg-green-50 p-4 flex">
                <div className="flex-shrink-0">
                  <Check className="h-5 w-5 text-green-400" />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-green-700">{success}</p>
                </div>
              </div>
            )}

            {/* Task Creation Status */}
            {creatingTasks.length > 0 && (
              <div className="space-y-2 bg-white p-4 rounded-lg border border-gray-200">
                <h3 className="font-medium text-gray-900 flex items-center">
                  <Loader2 className="w-4 h-4 mr-2 animate-spin text-blue-500" />
                  Creating Tasks...
                </h3>
                <div className="space-y-2 mt-2">
                  {creatingTasks.map((task, index) => (
                    <div key={index} className="flex items-center gap-2 py-1">
                      {task.status === 'pending' && (
                        <div className="w-4 h-4 rounded-full bg-gray-200 flex-shrink-0" />
                      )}
                      {task.status === 'creating' && (
                        <Loader2 className="w-4 h-4 animate-spin text-blue-600 flex-shrink-0" />
                      )}
                      {task.status === 'done' && (
                        <div className="w-4 h-4 rounded-full bg-green-500 flex-shrink-0" />
                      )}
                      {task.status === 'error' && (
                        <div className="w-4 h-4 rounded-full bg-red-500 flex-shrink-0" />
                      )}
                      <span className={`text-sm truncate ${
                        task.status === 'error' ? 'text-red-600' :
                        task.status === 'done' ? 'text-green-600' :
                        task.status === 'creating' ? 'text-blue-600' :
                        'text-gray-600'
                      }`}>
                        {task.name}
                        {task.error && (
                          <span className="ml-2 text-red-600 text-xs">
                            ({task.error})
                          </span>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Submit Button */}
            <div>
              <button
                type={activeTab === 'create' ? 'submit' : 'button'}
                disabled={
                  activeTab === 'create' ? (isLoading || !selectedList || !taskText.trim()) :
                  activeTab === 'edit' ? (selectedCards.size === 0 || !selectedMember || updatingCards) :
                  !selectedList || loadingExport
                }
                onClick={
                  activeTab === 'edit' ? handleBulkAssign :
                  activeTab === 'export' ? exportCards :
                  undefined
                }
                className="w-full flex items-center justify-center px-4 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300 disabled:cursor-not-allowed transition-colors"
              >
                {activeTab === 'create' ? (
                  isLoading ? (
                    <>
                      <Loader2 className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" />
                      Adding Tasks...
                    </>
                  ) : (
                    'Add Tasks to Trello'
                  )
                ) : activeTab === 'edit' ? (
                  updatingCards ? (
                    <>
                      <Loader2 className="animate-spin -ml-1 mr-3 h-5 w-5" />
                      Updating Tasks...
                    </>
                  ) : (
                    <>
                      <Users className="w-5 h-5 mr-2" />
                      Assign Selected Tasks
                    </>
                  )
                ) : loadingExport ? (
                  <>
                    <Loader2 className="animate-spin -ml-1 mr-3 h-5 w-5" />
                    Exporting Cards...
                  </>
                ) : (
                  <>
                    <FileJson className="w-5 h-5 mr-2" />
                    Export Cards as JSON
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}