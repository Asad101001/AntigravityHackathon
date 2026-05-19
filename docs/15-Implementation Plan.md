# Set 15: Chat Order Selection and Status Info - Implementation Plan

## Goal
Improve chatbot intelligence by introducing dynamic lookup of active bookings. When multiple bookings exist, trigger an interactive modal selection interface. When users ask about order status, parse the selection and reply with structured backend details.

## Proposed Changes
- **mobile/screens/ChatScreen.js**: Integrate user booking fetch calls on chat initialization. Add a prompt layout listing active bookings.
- **backend/routes/serviceRoutes.js**: Add dynamic order details response generator based on parsed query status intent.
