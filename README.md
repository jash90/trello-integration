# Trello Integration

A React web application that integrates with Trello's API to manage and enhance your Trello boards experience.

## Features

- **User Authentication**: Secure login and registration system
- **Trello Integration**: Connect with your Trello account to access boards and lists
- **Dashboard Interface**: View and interact with your Trello data in a user-friendly interface
- **User Settings**: Manage your account and Trello API credentials
- **OpenAI Integration**: Leverage AI capabilities to enhance your Trello workflow

## Tech Stack

- **Frontend**: React with TypeScript
- **Styling**: TailwindCSS
- **Routing**: React Router
- **API Integration**: Trello API, OpenAI API
- **Database**: Supabase
- **Build Tool**: Vite
- **Linting & Type Checking**: ESLint, TypeScript

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Trello account and API credentials
- Supabase account (for database)
- OpenAI API key (optional, for AI features)

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/trello-integration.git
   cd trello-integration
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file in the root directory with the following variables:
   ```
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   VITE_OPENAI_API_KEY=your_openai_api_key
   ```

4. Start the development server:
   ```
   npm run dev
   ```

5. Open your browser and navigate to `http://localhost:5173`

### Building for Production

```
npm run build
```

The built files will be in the `dist` directory.

## Usage

1. Register a new account or login with existing credentials
2. Connect your Trello account in the Settings page
3. Navigate to the Dashboard to view and interact with your Trello boards
4. Configure additional settings as needed

## Project Structure

- `/src`: Source code
  - `/components`: Reusable UI components
  - `/pages`: Application pages (Dashboard, Login, Register, Settings)
  - `/lib`: Utility functions and API integrations (Trello, OpenAI, Supabase)
  - `/types`: TypeScript type definitions

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgements

- [Trello API](https://developer.atlassian.com/cloud/trello/rest/api-group-actions/)
- [React](https://reactjs.org/)
- [Supabase](https://supabase.io/)
- [OpenAI](https://openai.com/) 