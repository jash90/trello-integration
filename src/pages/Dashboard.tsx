import React, { useState, useEffect } from 'react';
import { ListPlus, Loader2, Users, PencilLine, FileJson, Sparkles } from 'lucide-react';
import { getBoards, getLists, getBoardMembers, BASE_URL } from '../lib/trello';
import { generateTaskDescription } from '../lib/openai';
import { ModelSelector } from '../components/ModelSelector';
import type { TrelloBoard, TrelloList, TrelloMember, TrelloCard } from '../types/trello';

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
  // const [settings, setSettings] = useState<Partial<UserSettings>>({}); // Removed settings state
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
    // if (!settings.trello_key || !settings.trello_token) return;
    if (!trelloKey || !trelloToken) {
      setError('Trello API Key or Token not configured in environment variables.');
      return;
    }

    try {
      // const boardData = await getBoards(settings.trello_key, settings.trello_token);
      const boardData = await getBoards(trelloKey, trelloToken);
      setBoards(boardData);
      setError('');
    } catch (err) {
      setError('Failed to load boards. Please check your Trello API credentials in environment variables.');
      setBoards([]);
    }
  };

  async function loadLists(boardId: string) {
    if (!trelloKey || !trelloToken) return; // Added check
    try {
      // const listData = await getLists(boardId, settings.trello_key!, settings.trello_token!);
      const listData = await getLists(boardId, trelloKey, trelloToken);
      setLists(listData);
    } catch (err) {
      setError('Failed to load lists.');
    }
  }

  async function loadMembers(boardId: string) {
    if (!trelloKey || !trelloToken) return; // Added check
    try {
      // const memberData = await getBoardMembers(boardId, settings.trello_key!, settings.trello_token!);
      const memberData = await getBoardMembers(boardId, trelloKey, trelloToken);
      setMembers(memberData);
    } catch (err) {
      setError('Failed to load board members.');
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedList || !taskText.trim() || !trelloKey || !trelloToken) return; // Added key checks

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
      setTaskText('');
      setTimeout(() => setCreatingTasks([]), 3000); // Clear task status after 3 seconds
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create tasks. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  async function loadCards(listId: string) {
    // if (!settings.trello_key || !settings.trello_token) return;
    if (!trelloKey || !trelloToken) return; // Added check
    try {
      const response = await fetch(
        // `${BASE_URL}/lists/${listId}/cards?key=${settings.trello_key}&token=${settings.trello_token}`
        `${BASE_URL}/lists/${listId}/cards?key=${trelloKey}&token=${trelloToken}`
      );
      const data = await response.json();
      setCards(data);
    } catch (err) {
      setError('Failed to load cards.');
    }
  }

  async function handleBulkAssign() {
    // if (!selectedMember || selectedCards.size === 0) return;
    if (!selectedMember || selectedCards.size === 0 || !trelloKey || !trelloToken) return; // Added key checks
    
    setUpdatingCards(true);
    setError('');
    setSuccess('');
    
    try {
      const updatePromises = Array.from(selectedCards).map(async (cardId) => {
        // const response = await fetch(`${BASE_URL}/cards/${cardId}?key=${settings.trello_key}&token=${settings.trello_token}`, {
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
    // loadSettings(); // Removed loadSettings call
    loadBoards(); // Load boards on initial mount
  // }, [loadSettings]);
  }, []); // Changed dependency array

  // Save selected model when it changes
  useEffect(() => {
    localStorage.setItem('selectedModel', selectedModel);
  }, [selectedModel]);

  // useEffect(() => { // This effect is now redundant due to initial load
  //   loadBoards();
  // }, [settings.trello_key, settings.trello_token]);

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
    // if (!selectedList || !settings.trello_key || !settings.trello_token) return;
    if (!selectedList || !trelloKey || !trelloToken) return; // Added key checks
    
    setLoadingExport(true);
    setError('');
    
    try {
      const response = await fetch(
        // `${BASE_URL}/lists/${selectedList}/cards?key=${settings.trello_key}&token=${settings.trello_token}`
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <ListPlus className="w-8 h-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">
              Trello Task Creator
            </h1>
          </div>
          {/* Removed Settings link and LogoutButton */}
          {/* <div className="flex items-center gap-2">
            <Link
              to="/settings"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Settings
            </Link>
            <LogoutButton />
          </div> */}
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 space-y-6">
          {/* Updated warning message */}
          {/* {(!settings.trello_key || !settings.trello_token || !settings.openai_key) && ( */}
          {(!trelloKey || !trelloToken || !openaiKey) && (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
              <div className="flex">
                <div className="ml-3">
                  <p className="text-sm text-yellow-700">
                    {/* Please configure your API keys in the{' '}
                    <Link to="/settings" className="font-medium underline">
                      settings
                    </Link>{' '}
                    before using the application. */}
                    Please ensure VITE_TRELLO_KEY, VITE_TRELLO_TOKEN, and VITE_OPENAI_KEY are set in your .env file.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex space-x-4 border-b">
            <button
              onClick={() => setActiveTab('create')}
              className={`flex items-center gap-2 px-4 py-2 font-medium text-sm ${
                activeTab === 'create'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <ListPlus className="w-4 h-4" /> Create Tasks
            </button>
            <button
              onClick={() => setActiveTab('edit')}
              className={`flex items-center gap-2 px-4 py-2 font-medium text-sm ${
                activeTab === 'edit'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <PencilLine className="w-4 h-4" /> Edit Tasks
            </button>
            <button
              onClick={() => setActiveTab('export')}
              className={`flex items-center gap-2 px-4 py-2 font-medium text-sm ${
                activeTab === 'export'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <FileJson className="w-4 h-4" /> Export JSON
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="board"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Select Board
                </label>
                <select
                  id="board"
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
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
              </div>

              <div>
                <label
                  htmlFor="list"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Select List
                </label>
                <select
                  id="list"
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
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
              </div>
              
              <div>
                <label
                  htmlFor="member"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Assign All Tasks To
                </label>
                <select
                  id="member"
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
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
              </div>
            </div>

            {activeTab === 'create' ? (
            <div className="space-y-4">
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
                <label
                  htmlFor="prompt"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  AI Task Generation Prompt
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    id="prompt"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder="Describe the task you want to create..."
                    // disabled={!settings.openai_key}
                    disabled={!openaiKey} // Use env var
                  />
                  <input
                    type="number"
                    value={taskCount}
                    onChange={(e) => setTaskCount(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
                    className="w-20 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder="Count"
                    min="1"
                    max="100"
                    // disabled={!settings.openai_key}
                    disabled={!openaiKey} // Use env var
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      setIsGenerating(true);
                      setError('');
                      if (!openaiKey) { // Check key before calling
                        setError('OpenAI API Key not configured.');
                        setIsGenerating(false);
                        return;
                      }
                      try {
                        // const result = await generateTaskDescription(prompt, taskCount, settings.openai_key);
                        const result = await generateTaskDescription(prompt, taskCount, openaiKey); // Use env var
                        setTaskText(result);
                      } catch (err) {
                        setError(err instanceof Error ? err.message : 'Failed to generate task');
                      } finally {
                        setIsGenerating(false);
                      }
                    }}
                    // disabled={!prompt || !settings.openai_key || isGenerating}
                    disabled={!prompt || !openaiKey || isGenerating} // Use env var
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
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

              <label
                htmlFor="taskText"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Tasks
              </label>
              <div className="mt-1 mb-2 text-sm text-gray-500">
                Format each task as follows:
                <pre className="mt-1 p-2 bg-gray-50 rounded-md text-xs">
{`[{
  "title": "1. Wprowadzenie i Podstawowa Konfiguracja",
  "description": "Napisz mały program w JavaScripcie..."
}]`}
                </pre>
              </div>
              <textarea
                id="taskText"
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 font-mono text-sm"
                rows={20}
                value={taskText}
                onChange={(e) => setTaskText(e.target.value)}
                placeholder={JSON.stringify([
                  {
                    title: "1. Wprowadzenie i Podstawowa Konfiguracja",
                    description: "Opis zadania..."
                  }
                ], null, 2)}
                required
              />
            </div>
            ) : activeTab === 'edit' ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">
                    Select Tasks to Edit
                  </h3>
                  <button
                    type="button"
                    onClick={handleBulkAssign}
                    disabled={selectedCards.size === 0 || !selectedMember || updatingCards}
                    className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
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
                <div className="bg-gray-50 rounded-lg p-4">
                  {cards.map((card) => (
                    <div
                      key={card.id}
                      className="flex items-center space-x-3 py-2 px-3 hover:bg-gray-100 rounded-md"
                    >
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
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {card.name}
                        </p>
                        {card.idMembers.length > 0 && (
                          <p className="text-xs text-gray-500">
                            Assigned to: {members.find(m => m.id === card.idMembers[0])?.fullName || 'Unknown'}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">
                    Exported Cards JSON
                  </h3>
                  <button
                    type="button"
                    onClick={exportCards}
                    disabled={!selectedList || loadingExport}
                    className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
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
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                  </div>
                ) : exportedJson ? (
                  <pre className="bg-gray-50 p-4 rounded-lg overflow-auto max-h-[600px] text-sm font-mono">
                    {exportedJson}
                  </pre>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    Select a list to export cards as JSON
                  </div>
                )}
              </div>
            )}

            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <div className="text-sm text-red-700">{error}</div>
              </div>
            )}

            {success && (
              <div className="rounded-md bg-green-50 p-4">
                <div className="text-sm text-green-700">{success}</div>
              </div>
            )}

            {creatingTasks.length > 0 && (
              <div className="space-y-2 bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium text-gray-900">Creating Tasks...</h3>
                <div className="space-y-2">
                  {creatingTasks.map((task, index) => (
                    <div key={index} className="flex items-center gap-2">
                      {task.status === 'pending' && (
                        <div className="w-4 h-4 rounded-full bg-gray-200" />
                      )}
                      {task.status === 'creating' && (
                        <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                      )}
                      {task.status === 'done' && (
                        <div className="w-4 h-4 rounded-full bg-green-500" />
                      )}
                      {task.status === 'error' && (
                        <div className="w-4 h-4 rounded-full bg-red-500" />
                      )}
                      <span className={`text-sm ${
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

            <button
              type={activeTab === 'create' ? 'submit' : 'button'}
              disabled={
                activeTab === 'create' ? (isLoading || !selectedList) :
                activeTab === 'edit' ? (selectedCards.size === 0 || !selectedMember || updatingCards) :
                !selectedList || loadingExport
              }
              onClick={
                activeTab === 'edit' ? handleBulkAssign :
                activeTab === 'export' ? exportCards :
                undefined
              }
              className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
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
          </form>
        </div>
      </div>
    </div>
  );
}