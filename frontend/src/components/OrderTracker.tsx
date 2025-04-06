import React from 'react';
import { useOrderTracking } from '../hooks/useOrders';
import { format } from 'date-fns';

interface OrderTrackerProps {
  orderId: string;
}

const OrderTracker: React.FC<OrderTrackerProps> = ({ orderId }) => {
  const { data: order, isLoading, error, refetch } = useOrderTracking(orderId);

  if (isLoading) {
    return (
      <div className="text-center py-10">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="mt-2 text-gray-600">Loading order status...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4 text-center">
        <p className="text-red-700">Failed to load order tracking information.</p>
        <button
          onClick={() => refetch()}
          className="mt-2 px-4 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-md p-4 text-center">
        <p className="text-gray-700">Order information not available.</p>
      </div>
    );
  }

  // Define tracking stages with their equivalent statuses
  const trackingStages = [
    { stage: 'Order Placed', status: 'pending' },
    { stage: 'Order Confirmed', status: 'confirmed' },
    { stage: 'Preparing', status: 'preparing' },
    { stage: 'Ready for Pickup/Delivery', status: 'ready' },
    { stage: 'Delivered/Picked Up', status: ['delivered', 'completed'] },
  ];

  // Calculate current stage index
  const getCurrentStageIndex = (): number => {
    if (order.status === 'cancelled') return -1;
    
    for (let i = trackingStages.length - 1; i >= 0; i--) {
      const stage = trackingStages[i];
      if (Array.isArray(stage.status)) {
        if (stage.status.includes(order.status as string)) return i;
      } else if (stage.status === order.status) {
        return i;
      }
    }
    return 0;
  };

  const currentStageIndex = getCurrentStageIndex();
  
  // Format date
  const formatDateTime = (dateString: string | Date): string => {
    const date = new Date(dateString);
    return format(date, 'MMM d, yyyy h:mm a');
  };

  // Calculate estimated delivery time (mock data)
  const estimatedTime = order.estimatedDeliveryTime 
    ? formatDateTime(order.estimatedDeliveryTime)
    : 'Not available';

  const isCancelled = order.status === 'cancelled';
    
  return (
    <div className="bg-white rounded-lg overflow-hidden">
      {isCancelled ? (
        <div className="bg-red-50 border border-red-200 p-4 mb-4 rounded-md">
          <p className="text-red-700 font-medium">This order has been cancelled.</p>
          <p className="text-sm text-red-600 mt-1">
            If you have any questions, please contact customer support.
          </p>
        </div>
      ) : (
        <>
          <div className="bg-blue-50 p-4 mb-4 rounded-md">
            <h3 className="text-blue-800 font-medium">Order Status</h3>
            <p className="text-sm text-blue-700 mt-1">
              Your order is currently <span className="font-medium">{order.status}</span>
            </p>
            {order.isDelivery && (
              <p className="text-sm text-blue-700 mt-1">
                Estimated {order.status === 'ready' ? 'delivery' : 'ready'} time: {estimatedTime}
              </p>
            )}
          </div>

          {/* Track Progress */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-500">Progress</span>
              <span className="text-sm font-medium text-gray-500">
                {currentStageIndex >= 0 
                  ? `${Math.min(100, Math.round((currentStageIndex + 1) / trackingStages.length * 100))}%` 
                  : 'Cancelled'}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${
                  isCancelled 
                    ? 'bg-red-500' 
                    : 'bg-blue-600'
                }`}
                style={{
                  width: `${
                    isCancelled
                      ? '100%'
                      : `${Math.min(100, Math.round((currentStageIndex + 1) / trackingStages.length * 100))}%`
                  }`,
                }}
              ></div>
            </div>
          </div>

          {/* Tracking Timeline */}
          <div className="space-y-6 pl-4">
            {trackingStages.map((stage, index) => {
              const isCurrentStage = index === currentStageIndex;
              const isPastStage = index < currentStageIndex;
              
              let statusClass = 'bg-gray-200 text-gray-400'; // Future stage
              if (isCurrentStage) statusClass = 'bg-blue-500 text-white'; // Current stage
              if (isPastStage) statusClass = 'bg-green-500 text-white'; // Past stage
              if (isCancelled) statusClass = 'bg-gray-300 text-gray-500'; // All stages when order is cancelled
              
              return (
                <div key={index} className="relative flex items-start">
                  <div className="relative z-10">
                    <div className={`flex items-center justify-center w-8 h-8 rounded-full ${statusClass}`}>
                      {isPastStage ? (
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      ) : (
                        <span className="text-xs font-semibold">{index + 1}</span>
                      )}
                    </div>
                  </div>
                  
                  {/* Line connecting stages */}
                  {index < trackingStages.length - 1 && (
                    <div
                      className={`absolute top-8 left-4 w-0.5 h-12 -ml-px ${
                        isPastStage ? 'bg-green-500' : 'bg-gray-200'
                      }`}
                    ></div>
                  )}
                  
                  <div className="ml-4">
                    <h3 className={`text-sm font-medium ${
                      isCurrentStage ? 'text-blue-600' :
                      isPastStage ? 'text-gray-900' :
                      'text-gray-500'
                    }`}>
                      {stage.stage}
                    </h3>
                    
                    <p className="mt-1 text-sm text-gray-500">
                      {isCurrentStage && !isCancelled ? (
                        <span className="text-blue-600">In progress</span>
                      ) : isPastStage ? (
                        <span className="text-gray-600">Completed</span>
                      ) : (
                        <span className="text-gray-400">Pending</span>
                      )}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Order Info Summary */}
      <div className="border-t border-gray-200 mt-8 pt-6">
        <h3 className="text-sm font-medium text-gray-700 mb-2">Order Summary</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-500">Order #</p>
            <p className="font-medium">{order.orderNumber}</p>
          </div>
          <div>
            <p className="text-gray-500">Order Date</p>
            <p className="font-medium">{formatDateTime(order.createdAt)}</p>
          </div>
          <div>
            <p className="text-gray-500">Items</p>
            <p className="font-medium">{order.items.length}</p>
          </div>
          <div>
            <p className="text-gray-500">Total</p>
            <p className="font-medium">${order.total.toFixed(2)}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderTracker; 