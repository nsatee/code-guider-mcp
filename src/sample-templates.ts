import type { CodeTemplate } from './types';

export const SAMPLE_TEMPLATES: CodeTemplate[] = [
  {
    id: 'react-button-component',
    name: 'React Button Component',
    description: 'A reusable React button component with TypeScript and Tailwind CSS',
    type: 'component',
    content: `import React from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
}

const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  onClick,
  className,
  type = 'button',
}) => {
  const baseClasses = 'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none';
  
  const variantClasses = {
    primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
    secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
    outline: 'border border-input hover:bg-accent hover:text-accent-foreground',
    ghost: 'hover:bg-accent hover:text-accent-foreground',
  };
  
  const sizeClasses = {
    sm: 'h-9 px-3 text-sm',
    md: 'h-10 px-4 py-2',
    lg: 'h-11 px-8 text-lg',
  };

  return (
    <button
      type={type}
      className={cn(
        baseClasses,
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
};

export default Button;`,
    variables: ['ComponentName', 'framework', 'stylingFramework'],
    tags: ['react', 'typescript', 'tailwind', 'component', 'ui'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'react-form-component',
    name: 'React Form Component',
    description: 'A reusable React form component with validation and error handling',
    type: 'component',
    content: `import React, { useState } from 'react';
import { cn } from '@/lib/utils';

export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'password' | 'number' | 'textarea';
  required?: boolean;
  placeholder?: string;
  validation?: (value: string) => string | null;
}

export interface FormProps {
  fields: FormField[];
  onSubmit: (data: Record<string, string>) => void;
  submitText?: string;
  className?: string;
}

const Form: React.FC<FormProps> = ({
  fields,
  onSubmit,
  submitText = 'Submit',
  className,
}) => {
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleInputChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateField = (field: FormField, value: string): string | null => {
    if (field.required && !value.trim()) {
      return \`\${field.label} is required\`;
    }
    
    if (field.validation) {
      return field.validation(value);
    }
    
    return null;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newErrors: Record<string, string> = {};
    let isValid = true;

    fields.forEach(field => {
      const value = formData[field.name] || '';
      const error = validateField(field, value);
      
      if (error) {
        newErrors[field.name] = error;
        isValid = false;
      }
    });

    setErrors(newErrors);

    if (isValid) {
      onSubmit(formData);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={cn('space-y-4', className)}>
      {fields.map(field => (
        <div key={field.name} className="space-y-2">
          <label htmlFor={field.name} className="text-sm font-medium">
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </label>
          
          {field.type === 'textarea' ? (
            <textarea
              id={field.name}
              value={formData[field.name] || ''}
              onChange={(e) => handleInputChange(field.name, e.target.value)}
              placeholder={field.placeholder}
              className={cn(
                'w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring',
                errors[field.name] && 'border-red-500'
              )}
              rows={4}
            />
          ) : (
            <input
              id={field.name}
              type={field.type}
              value={formData[field.name] || ''}
              onChange={(e) => handleInputChange(field.name, e.target.value)}
              placeholder={field.placeholder}
              className={cn(
                'w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring',
                errors[field.name] && 'border-red-500'
              )}
            />
          )}
          
          {errors[field.name] && (
            <p className="text-sm text-red-500">{errors[field.name]}</p>
          )}
        </div>
      ))}
      
      <button
        type="submit"
        className="w-full bg-primary text-primary-foreground py-2 px-4 rounded-md hover:bg-primary/90 transition-colors"
      >
        {submitText}
      </button>
    </form>
  );
};

export default Form;`,
    variables: ['ComponentName', 'framework', 'validationLibrary'],
    tags: ['react', 'typescript', 'form', 'validation', 'component'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'react-modal-component',
    name: 'React Modal Component',
    description: 'A reusable React modal component with backdrop and animations',
    type: 'component',
    content: `import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  className,
}) => {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
  };

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div
        className={cn(
          'relative bg-background rounded-lg shadow-lg transition-all duration-300',
          'w-full mx-4',
          sizeClasses[size],
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between p-6 border-b">
            <h2 className="text-lg font-semibold">{title}</h2>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
        
        {/* Content */}
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default Modal;`,
    variables: ['ComponentName', 'framework', 'animationLibrary'],
    tags: ['react', 'typescript', 'modal', 'portal', 'animation'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'express-api-route',
    name: 'Express API Route',
    description: 'A RESTful API route with Express.js, validation, and error handling',
    type: 'api',
    content: `import express from 'express';
import { body, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';

const router = express.Router();

// Validation middleware
const validateRequest = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array(),
    });
  }
  next();
};

// GET /api/{{resourceName}}
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page = 1, limit = 10, search } = req.query;
    
    // TODO: Implement database query
    const resources = [];
    const total = 0;
    
    res.json({
      success: true,
      data: resources,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/{{resourceName}}/:id
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    
    // TODO: Implement database query
    const resource = null;
    
    if (!resource) {
      return res.status(404).json({
        success: false,
        message: 'Resource not found',
      });
    }
    
    res.json({
      success: true,
      data: resource,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/{{resourceName}}
router.post(
  '/',
  [
    body('name').notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    // Add more validation rules as needed
  ],
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const resourceData = req.body;
      
      // TODO: Implement database creation
      const newResource = { id: Date.now(), ...resourceData };
      
      res.status(201).json({
        success: true,
        data: newResource,
        message: 'Resource created successfully',
      });
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/{{resourceName}}/:id
router.put(
  '/:id',
  [
    body('name').optional().notEmpty().withMessage('Name cannot be empty'),
    body('email').optional().isEmail().withMessage('Valid email is required'),
    // Add more validation rules as needed
  ],
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const updateData = req.body;
      
      // TODO: Implement database update
      const updatedResource = { id, ...updateData };
      
      res.json({
        success: true,
        data: updatedResource,
        message: 'Resource updated successfully',
      });
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/{{resourceName}}/:id
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    
    // TODO: Implement database deletion
    const deleted = true;
    
    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Resource not found',
      });
    }
    
    res.json({
      success: true,
      message: 'Resource deleted successfully',
    });
  } catch (error) {
    next(error);
  }
});

// Error handling middleware
router.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('API Error:', error);
  
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { error: error.message }),
  });
});

export default router;`,
    variables: ['resourceName', 'framework', 'validationLibrary'],
    tags: ['express', 'api', 'nodejs', 'validation', 'error-handling'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'jest-unit-test',
    name: 'Jest Unit Test',
    description: 'A comprehensive unit test file using Jest and React Testing Library',
    type: 'test',
    content: `import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import {{ComponentName}} from '../{{ComponentName}}';

// Mock any external dependencies
jest.mock('@/lib/utils', () => ({
  cn: (...classes: string[]) => classes.filter(Boolean).join(' '),
}));

describe('{{ComponentName}}', () => {
  // Basic rendering tests
  describe('Rendering', () => {
    it('renders without crashing', () => {
      render(<{{ComponentName}} />);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('renders with custom props', () => {
      const props = {
        variant: 'secondary' as const,
        size: 'lg' as const,
        disabled: true,
      };
      render(<{{ComponentName}} {...props}>Test Button</{{ComponentName}}>);
      
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      expect(button).toBeDisabled();
    });
  });

  // Interaction tests
  describe('Interactions', () => {
    it('calls onClick when clicked', () => {
      const handleClick = jest.fn();
      render(<{{ComponentName}} onClick={handleClick}>Click me</{{ComponentName}}>);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('does not call onClick when disabled', () => {
      const handleClick = jest.fn();
      render(
        <{{ComponentName}} onClick={handleClick} disabled>
          Click me
        </{{ComponentName}}>
      );
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  // Accessibility tests
  describe('Accessibility', () => {
    it('has proper ARIA attributes', () => {
      render(<{{ComponentName}} aria-label="Test button">Test</{{ComponentName}}>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Test button');
    });

    it('is keyboard accessible', () => {
      const handleClick = jest.fn();
      render(<{{ComponentName}} onClick={handleClick}>Test</{{ComponentName}}>);
      
      const button = screen.getByRole('button');
      button.focus();
      expect(button).toHaveFocus();
      
      fireEvent.keyDown(button, { key: 'Enter' });
      expect(handleClick).toHaveBeenCalled();
    });
  });

  // Edge cases
  describe('Edge Cases', () => {
    it('handles empty children', () => {
      render(<{{ComponentName}} />);
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('handles undefined onClick', () => {
      render(<{{ComponentName}} onClick={undefined}>Test</{{ComponentName}}>);
      const button = screen.getByRole('button');
      fireEvent.click(button);
      // Should not throw an error
    });
  });

  // Snapshot tests
  describe('Snapshots', () => {
    it('matches snapshot with default props', () => {
      const { container } = render(<{{ComponentName}}>Test Button</{{ComponentName}}>);
      expect(container.firstChild).toMatchSnapshot();
    });

    it('matches snapshot with all props', () => {
      const props = {
        variant: 'outline' as const,
        size: 'sm' as const,
        disabled: false,
        className: 'custom-class',
      };
      const { container } = render(
        <{{ComponentName}} {...props}>Test Button</{{ComponentName}}>
      );
      expect(container.firstChild).toMatchSnapshot();
    });
  });
});`,
    variables: ['ComponentName', 'testFramework', 'testingLibrary'],
    tags: ['jest', 'testing', 'react-testing-library', 'unit-test'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export function getSampleTemplates(): CodeTemplate[] {
  return SAMPLE_TEMPLATES;
}
