import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../utils/api';
import { extractData } from '../utils/apiResponse';
import { handleApiError } from '../utils/errorHandler';

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
}

export function useCustomers(searchQuery?: string) {
  return useQuery({
    queryKey: ['customers', searchQuery],
    queryFn: () => {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      
      const endpoint = `/admin/customers?${params.toString()}`;
      return api.get<Customer[]>(endpoint)
        .then(res => {
          const data = extractData<Customer[] | { data: Customer[] }>(res.data);
          return Array.isArray(data) ? data : [];
        })
        .catch((error) => handleApiError(error, {
          allowlist: [], // Customers sind kritisch - keine silent fails für 404
          fallbackValue: [],
          context: 'Customers List',
          endpoint
        }));
    },
    staleTime: 2 * 60 * 1000,
    select: (data) => Array.isArray(data) ? data : [],
  });
}

export function useCustomer(id: string | null) {
  return useQuery({
    queryKey: ['customers', id],
    queryFn: () => api.get<Customer>(`/admin/customers/${id}`).then(res => extractData<Customer>(res.data)),
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
  });
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Customer> }) =>
      api.put(`/admin/customers/${id}`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['customers', variables.id] });
    },
  });
}

export function useDeleteCustomer() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => api.delete(`/admin/customers/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
}

