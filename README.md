# Inspire Africa Coffee Fund Platform

A comprehensive digital platform for managing coffee farmer credit, input distribution, and harvest repayment in Africa.

## Overview

The Inspire Africa Coffee Fund platform is designed to empower coffee farmers by providing a structured system for:

- Credit access and management for farmers and cooperatives
- Input distribution tracking
- Harvest recording and loan repayment
- Supplier relationship management
- SACCO and cooperative integration

The platform connects key stakeholders in the coffee value chain, enabling transparent and efficient operations.

## Features

- **User Management**
  - Farmer registration and KYC verification
  - Cooperative and SACCO management
  - Role-based access control (Admin, Field Officers, Farmers)

- **Credit System**
  - Credit request submission and approval workflow
  - Loan disbursement tracking
  - Structured repayment schedules
  - Interest calculation and management

- **Input Management**
  - Supplier catalog integration
  - Input order processing
  - Distribution tracking
  - Inventory management

- **Harvest Recording**
  - Coffee harvest documentation
  - Quality grading
  - Value calculation
  - Automatic loan repayment allocation

- **Analytics & Reporting**
  - Loan portfolio performance metrics
  - Repayment rates tracking
  - Seasonal harvest analytics
  - Financial reports generation

## Technical Stack

- **Frontend**: React.js with Tailwind CSS
- **Backend**: Firebase (Firestore, Authentication, Storage)
- **State Management**: React Context API
- **Deployment**: Vercel/Netlify

## Development Setup

1. Clone the repository:
   ```
   git clone https://github.com/your-org/inspire-africa-coffee-fund.git
   cd inspire-africa-coffee-fund
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Set up Firebase configuration:
   - Create a Firebase project at [https://console.firebase.google.com/](https://console.firebase.google.com/)
   - Enable Firestore, Authentication, and Storage
   - Create a web app and get your configuration
   - Add the configuration to `src/firebase/firebase.js`

4. Run the development server:
   ```
   npm run dev
   ```

5. Build for production:
   ```
   npm run build
   ```

## Project Structure

```
/src
  /components       # Reusable UI components
  /contexts         # React context providers
  /firebase         # Firebase configuration and utilities
  /hooks            # Custom React hooks
  /screens          # Main application screens
    /auth           # Authentication screens
    /coffee         # Core functionality screens
  /utils            # Helper functions and utilities
```

## Authentication

The platform uses Firebase Authentication with multiple sign-in methods:
- Email/Password
- Phone authentication for farmers
- OAuth providers (Google, optional)

## Data Model

The system uses Firestore with the following main collections:
- `users` - User accounts and profiles
- `farmers` - Farmer profiles with KYC data
- `cooperatives` - Coffee cooperatives information
- `saccos` - Savings and Credit Cooperative Organizations
- `suppliers` - Input suppliers and service providers
- `creditRequests` - Loan application records
- `loans` - Active and completed loans
- `inputOrders` - Agricultural input orders
- `harvests` - Coffee harvest records
- `transactions` - Financial transaction logs

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Contact

Project Link: [https://github.com/BANADDA/inspire-africa-coffee-fund](https://github.com/BANADDA/inspire-africa-coffee-fund)
